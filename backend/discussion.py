import json
from groq import Groq
import os
from dotenv import load_dotenv

from fastapi import FastAPI
from pydantic import BaseModel
from typing import List
import uvicorn
from fastapi.middleware.cors import CORSMiddleware

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

def generate_opinion(question, agents, rounds):

    consensus = []

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
            consensus.append(round_responses)
            round_responses = []
    else:
        raise KeyError(f"mode {mode} not implemented")

    return consensus

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
    consensus = generate_opinion(request_body.question, request_body.agents, request_body.rounds)
    return consensus


if __name__ == "__main__":
    uvicorn.run("discussion:app", host="0.0.0.0", port=8000, reload=True)
