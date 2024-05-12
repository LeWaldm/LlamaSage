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
import networkx as nx
from pyvis.network import Network
from copy import deepcopy

GROQ_MODEL = 'llama3-70b-8192'
GRAPH_FILE = 'network.html'

# super dirty hack to get the final states to transfer to another method without 
# 
AGREEMENTS_FINAL = []
FINAL_CONTEXTS = []

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

def create_agreement_graph(agents, agreements):
    multiplier = 5
    edge_color = '#d57eeb'

    G = nx.complete_graph(agents)
    for a, agree in zip(agents, agreements):
        for b, value in agree.items():
            if a == b:
                continue
            G.add_edge(a,b,weight=(value-1)*multiplier + 1, color=edge_color)
    pos = nx.spring_layout(G)

    base_size = 700
    size = max([len(v) * base_size for v in G.nodes()])
    nx.draw_networkx_nodes(G, pos, 
        node_size=size, 
        node_color="skyblue") 

    # Draw edges with widths proportional to weight
    for (u, v, d) in G.edges(data=True):
        nx.draw_networkx_edges(G, pos, edgelist=[(u, v)], width=d['weight'] * multiplier)

    # Labels
    nx.draw_networkx_labels(G, pos)
    edge_labels = nx.get_edge_attributes(G, 'weight')
    nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels)

    net = Network(width='1900px', height='900px', bgcolor='#222222', font_color='white', notebook=True)
    net.repulsion()
    net.add_node('Plato', shape='image', image ="/Users/lewaldm/Documents/Llmama3Hackathon/depositphotos_157821304-stock-photo-classic-statue-socrates.jpg")
    net.add_node('Immanuel Kant')
    net.add_node('Lawyer')

    net.from_nx(G)
    net.show(GRAPH_FILE)

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
            {"role": "system", "content": "Pretend you are " + persona[agent] + " and you behave like " + persona[agent] + " would."},
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
            agreements = []
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

                # analyze agreement
                msg_agree = {"role": "user", "content": f"For each agent of {agent_ids_other} provide a number from 1 to 5 indicating how much you agree with the statement. 1 means you strongly disagree and 5 means you strongly agree. Give the output as a python dictionary with the follwing keys {agent_ids_other}. You MUST only return a python dictionary."}
                completion = client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=agent_context + [msg_agree],
                    n=1)
                print('############# AGREEMENT ################')
                out = completion.choices[0].message.content
                out = out[out.index('{'):out.index('}')+1]
                print(out)
                d = eval(out)
                d[agents[i]] = 5
                agreements.append(d)
                print('############# AGREEMENT ################')
            AGREEMENTS_FINAL = agreements
            yield round_responses
    else:
        raise KeyError(f"mode {mode} not implemented")


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
    # print('1################')
    summary = completion.choices[0].message.content
    # print(summary)

    content = f'Your task is to analyze the summary of the positions of each agent and provide a final verdict of the discussion in the form reasoning and final verdict in a JSON format. You MUST return only JSON object.'
    msg.append({"role": "user", "content": content})
    # msg.append({"role": "user", "content": "Please provide a final verdict of the discussion in JSON format."})
    # msg = ({"role": "user", "content": content})

    completion = client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=msg,
                    n=1)

    # print('2################')
    # print(completion.choices[0].message.content)

    content = f'Your task is to look at the final verdict of all agents and provide final consensus of the discussion in a JSON format. consensus must be in 2 sentences.'
    msg.append({"role": "user", "content": content})
    # msg.append({"role": "user", "content": "Please provide a final verdict of the discussion in JSON format."})
    # msg = ({"role": "user", "content": content})

    completion = client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=msg,
                    n=1)
    json_out = completion.choices[0].message.content
    # print(json_out)


    # draw final graph with agreement
    agent_ids_copy = deepcopy(agent_ids)
    agreements_copy = deepcopy(AGREEMENTS_FINAL)
    create_agreement_graph(agent_ids, AGREEMENTS_FINAL)
    
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
