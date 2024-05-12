import json
from groq import Groq
import os
from dotenv import load_dotenv

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Dict, AsyncGenerator
import uvicorn
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

GROQ_MODEL = 'llama3-70b-8192'

"""
modes
- sequential: agents are ordered in a sequence
- parallel (similar to shared paper)

"""

def construct_message(agents, agent_ids, contexts, question, idx):
    if len(agents) == 0:
        return {"role": "user", "content": "Can you double check that your answer is correct. Put your final answer in the form (X) at the end of your response."}

    prefix_string = "These are the solutions to the problem from other agents: "

    for id, context in zip(agent_ids, contexts):
        agent_response = context[idx]["content"]
        response = f"\n\n The solution from {id} is: ```{agent_response}```"
        prefix_string = prefix_string + response

    prefix_string = prefix_string + """\n\n Using the reasoning from other agents as additional advice, can you give an updated answer? Examine your solution and that other agents step by step. Put your answer in the form (X) at the end of your response.""".format(question)
    return {"role": "user", "content": prefix_string}

async def generate_opinion(question, agents, rounds) -> AsyncGenerator[List[Dict[str, str]], None]:

    # setup
    persona = json.load(open('persona.json'))
    load_dotenv()
    client = Groq(
        api_key = os.environ.get("GROQ_API_KEY"),
    )

    # setup initial context
    agent_contexts = []
    for agent in agents:
        agent_contexts.append([
            {"role": "system", "content": persona[agent]},
            {"role": "user", "content": question}
        ])

    # question loop 
    mode = 'all_previous_replies'
    if mode == 'all_previous_replies':
        """ each agent has as context all previous answers from all agents."""


        for round in range(rounds):
            print(f'\n\n=====================================')
            print(f'Round {round + 1}')
            print(f'=====================================')
            round_responses = []
            for i, agent_context in enumerate(agent_contexts):

                if round != 0:
                    agent_contexts_other = agent_contexts[:i] + agent_contexts[i+1:]
                    agent_ids_other = agents[:i] + agents[i+1:]
                    message = construct_message(agents, agent_ids_other, agent_contexts_other, question, 2 * round - 1)
                    agent_context.append(message)

                # generate answer
                answer_context = agent_context
                completion = client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=answer_context,
                    n=1)

                # construct assistant message
                content = completion.choices[0].message.content
                assistant_message = {"role": "assistant", "content": content}
                agent_context.append(assistant_message)

                # feedback
                print('\n\n-----------------------------')
                print(f'{agents[i]} says:')
                print('-----------------------------')
                print(content)
                round_responses.append({agents[i]: content})
    else:
        raise KeyError(f"mode {mode} not implemented")

    yield round_responses

def generate_consensus(question, debate):
    
    # setup
    client = setup_groq()
    agent_ids = [next(iter(d.keys())) for d in debate[0]]
    msg = []
    msg.append(
        {'role': 'system', 'content': "You are an objective moderator of a discussion between multiple agents. The agents try to answer a particular question."}
    )

    # iterate
    content = f'The question of this debate is {question}. The participants of the discussion are {agent_ids}.'
    content = f'Your task is to summarize the position of each agent in a single sentence in a JSON format. The agents are {agent_ids} and the question is {question}'
    content += 'All agents now state their initial perspective on the question.'

    mode = 'nonparsed'
    if mode == 'nonparsed':
        content += str(debate)
    elif mode == 'parsed':
        for round, responses in enumerate(debate):
            if round > 0:
                content += f'\n\n\n\nRound {round}: The agents have reflected on the statement of the previous round and present their updated view.'
            for d in responses:
                for agent, response in d.items():  # it is only one 
                    content += f'\n\n\n\n{agent} says: {response}'

    msg.append({
        "role": "user",
        "content": content
    })
    completion = client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=msg,
                    n=1)
    print('1################')
    summary = completion.choices[0].message.content
    print(summary)

    content = f'Your task is to analyze the summary of the positions of each agent and provide a final verdict of the discussion in the form reasoning and final verdict in a JSON format. You MUST return only JSON object.'
    msg.append({"role": "user", "content": content})
    # msg.append({"role": "user", "content": "Please provide a final verdict of the discussion in JSON format."})
    # msg = ({"role": "user", "content": content})

    completion = client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=msg,
                    n=1)

    print('2################')
    print(completion.choices[0].message.content)

    content = f'Your task is to look at the final verdict of all agents and provide final consensus of the discussion in a JSON format. consensus must be in 2 sentences.'
    msg.append({"role": "user", "content": content})
    # msg.append({"role": "user", "content": "Please provide a final verdict of the discussion in JSON format."})
    # msg = ({"role": "user", "content": content})

    completion = client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=msg,
                    n=1)
    json_out = completion.choices[0].message.content
    print(json_out)
    
    return json_out

def setup_groq():
    load_dotenv()
    client = Groq(
        api_key = os.environ.get("GROQ_API_KEY"),
    )
    return client

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

class OpinionGenerateRequestBody(BaseModel):
    agents: List[str] = ['Lawyer', 'Immanuel Kant']
    question: str = 'What is the meaning of life?'
    rounds: int = 2

# class OpinionGenerateResponse(BaseModel):
#     consensus: str

@app.post("/debate")
async def generate(request_body: OpinionGenerateRequestBody):
    async def generate_responses():
        consensus = []
        async for round_response in generate_opinion(request_body.question, request_body.agents, request_body.rounds):
            yield json.dumps(round_response)
            consensus.append(round_response)
        final_consensus = generate_consensus(request_body.question, consensus)
        yield json.dumps({"final_consensus": final_consensus})
    return StreamingResponse(generate_responses())

if __name__ == "__main__":
    uvicorn.run("discussion:app", host="0.0.0.0", port=8000, reload=True)
