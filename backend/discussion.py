""" we draw inspiration from here https://github.com/composable-models/llm_multiagent_debate"""

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
import os

GROQ_MODEL = 'llama3-70b-8192'
GRAPH_PATH = './backend/network.html'
IMAGES_GRAPH_BASE_PATH = '/Users/lewaldm/Documents/Llmama3Hackathon/LlamaSage/frontend/public/thumbnails/'
PERSONA_FILE = 'persona.json'

Q_initial_system_setyp = 'You will discuss a common quesiton with other participants. The goal is to find a joint solution to the proposed question. Each of your answer should have at most 130 words.'
Q_prior_response = """\n\nConsidering the positions from any participant of the other participants, has your opinion changed? Try to persuade a single participant of your opinion."""

def construct_message(agents, agent_ids, contexts, question, idx):
    # if len(agents) == 0:
    #     return {"role": "user", "content": "Can you double check that your answer is correct. Put your final answer in the form (X) at the end of your response."}

    prefix_string = "These are the positions to the initial question from other participants: "

    for id, context in zip(agent_ids, contexts):
        agent_response = context[idx]["content"]
        response = f"\n\n The position from {id} is: ```{agent_response}```"
        prefix_string = prefix_string + response

    # prefix_string = prefix_string + """\n\nUsing the positions from other agents as additional advice, can you give an updated answer? Examine your solution and that other agents step by step. Put your answer in the form (X) at the end of your response.""".format(question)
    # prefix_string = prefix_string + """\n\nConsidering the positions from all other participants, has your opinion changed? Can you find a solution that satisfies all other participants? Put your very short answer in the form (X) at the end of your response.""".format(question)
    # prefix_string = prefix_string + """\n\nConsidering the positions from all other participants, has your opinion changed? If not, try to persuade the other participants of your opinion. Put your very short opinion/answer in the form (X) at the end of your response."""
    prefix_string = prefix_string + Q_prior_response


    return {"role": "user", "content": prefix_string}

def create_agreement_graph(agents, agreements):
    """ really messy code """

    multiplier = 7
    edge_color = '#d57eeb'

    G = nx.complete_graph(agents)
    for a, agree in zip(agents, agreements):
        for b, value in agree.items():
            if a == b:
                continue
            G.add_edge(a,b,weight=(value-1)*multiplier + 1, color=edge_color)
    pos = nx.spring_layout(G)

    base_size = 1
    size = max([len(v) * base_size for v in G.nodes()])
    nx.draw_networkx_nodes(G, pos, 
        node_size=size, 
        node_color="skyblue") 

    # Draw edges with widths proportional to weight
    for (u, v, d) in G.edges(data=True):
        value  = d['weight']
        nx.draw_networkx_edges(G, pos, edgelist=[(u, v)], width=(value-1)*multiplier + 1)

    # Labels
    nx.draw_networkx_labels(G, pos)
    edge_labels = nx.get_edge_attributes(G, 'weight')
    nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels)

    net = Network(width='1900px', height='900px', bgcolor='#222222', font_color='white', notebook=True)
    net.repulsion()

    for agent in agents:
        net.add_node(agent, shape='image', image = os.path.join(IMAGES_GRAPH_BASE_PATH, agent + '.png'))

    net.from_nx(G)
    net.show(GRAPH_PATH)
    print('done')

def parse_to_json(completion):
    try: 
        out = completion.choices[0].message.content
        out = out[out.index('{'):out.index('}')+1]
        out = eval(out)
    except:
        out = {}
    return out

async def generate_opinion(question, agents, rounds) -> AsyncGenerator[List[Dict[str, str]], None]:

    # setup
    persona = json.load(open(PERSONA_FILE))
    load_dotenv()
    client = Groq(
        api_key = os.environ.get("GROQ_API_KEY"),
    )

    # setup initial context
    agent_contexts = []
    for agent in agents:
        agent_contexts.append([
            {"role": "system", "content": "Pretend you are and behave like " + persona[agent] + ". " + Q_initial_system_setyp},
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

                agent_ids_other = agents[:i] + agents[i+1:]
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
                msg_agree = {"role": "user", "content": f"For each participant of {agent_ids_other} provide a number from 1 to 5 indicating how much you agree with their opinion/answer (X) at the end of their statement. 1 means you strongly disagree and 5 means you strongly agree. Give the output as a python dictionary with the follwing keys {agent_ids_other}. You MUST only return a python dictionary."}
                completion = client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=agent_context + [msg_agree],
                    n=1)
                print('############# AGREEMENT ################')
                d = parse_to_json(completion)
                print(d)
                d[agents[i]] = 5
                agreements.append(d)
                print('############# AGREEMENT ################')
            if round > 0:
                create_agreement_graph(agents, agreements)
            yield round_responses, agent_contexts, agreements
    else:
        raise KeyError(f"mode {mode} not implemented")


def generate_consensus(question, debate, agent_context, agreements):
    
    # setup
    client = setup_groq()
    agent_ids = [next(iter(d.keys())) for d in debate[0]]
    msg = []
    msg.append(
        {'role': 'system', 'content': "You are an objective moderator of a discussion between multiple participants. The participants try to answer a particular question."}
    )

    # iterate
    content = f'The question of this debate is {question}. The participants of the discussion are {agent_ids}.'
    content = f'Your task is to summarize the position of each participant in a single sentence in a JSON format. The participants are {agent_ids} and the question is {question}'
    content += 'All agents now state their initial perspective on the question.'

    # get all content
    mode = 'nonparsed'
    if mode == 'nonparsed':
        content += str(debate)
    elif mode == 'parsed':
        for round, responses in enumerate(debate):
            if round > 0:
                content += f'\n\n\n\nRound {round}: The participants have reflected on the statement of the previous round and present their updated view.'
            for d in responses:
                for agent, response in d.items():  # it is only one 
                    content += f'\n\n\n\n{agent} says: {response}'

    # get bullet points summary
    msg.append({
        "role": "user",
        "content": content
    })
    completion = client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=msg,
                    n=1)
    print('################ Summary bullet points')
    summary_per_agent = parse_to_json(completion)
    print(summary_per_agent)
    msg.append({'role': 'assistant', 'content': str(summary_per_agent)})


    # get final verdict
    content = f'Your task is to look at the final verdict of all agents and provide final consensus of the discussion in a JSON format with key consensus. consensus must be in 2 sentences.'
    msg.append({"role": "user", "content": content})
    completion = client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=msg,
                    n=1)
    print('################ Summary final verdict')
    json_out = parse_to_json(completion)
    final_verdict = json_out['consensus']


    # draw final graph with agreement
    # version 1: only very last round
    consensus_label = 'consensus'
    consensus_dict = {}
    print('################ FINAL agreement start')
    for i, agent in enumerate(agent_ids):
        msg = [
            agent_context[i][0], # inital system message
            {
                "role": "user",
                "content": f'Please give your current opinion on the discussion with the initial question {question}.'
            }, # fake user prompt
            {
                "role": "assistant",
                "content": agent_context[-1][i]['content']
            }, # latest answer of the agent
            {
                'role': 'user',
                'content': f'The objective moderator of the discussion has summarized the positions of all agents in the following verdict: {final_verdict}. Provide a number from 1 to 5 indicating how much you agree with the final verdict. 1 means you strongly disagree and 5 means you strongly agree. Give the output as a python dictionary with the key agreement. You MUST only return a python dictionary.'
            }
        ]
        completion = client.chat.completions.create(
                model=GROQ_MODEL,
                messages=msg,
                n=1)
        d = parse_to_json(completion)
        agreements[i][consensus_label] = d['agreement']
        consensus_dict[agent] = d['agreement']
    print('################ FINAL agreement done')

    # actually draw graph
    print('################ FINAL graph start')
    create_agreement_graph(agent_ids + [consensus_label], agreements + [consensus_dict])
    print('################ FINAL graph done')

    print('################ FINAL json_out')
    return json_out['consensus'], summary_per_agent

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
        async for round_response, agent_contexts, agreements in generate_opinion(request_body.question, request_body.agents, request_body.rounds):
            yield json.dumps(round_response)
            consensus.append(round_response)
        print('################### Start consensus')
        final_consensus, summary_per_agent = generate_consensus(request_body.question, consensus, agent_contexts, agreements)
        print('################### Finish consensus')
        print(final_consensus)
        yield json.dumps({"final_consensus": final_consensus, 'summary': summary_per_agent})
    return StreamingResponse(generate_responses())


@app.post("/graph")
async def get_agreement_graph():
    with open(GRAPH_PATH, 'r') as file:  # r to open file in READ mode
        html_as_string = file.read()
    return html_as_string

class AddMemberRequestBody(BaseModel):
    name: str = 'new_agent'
    description: str = 'I am a new agent.'

@app.post("/add_persona")
async def add_persona(request_body: AddMemberRequestBody):

    persona = json.load(open(PERSONA_FILE))
    persona[request_body.name] = request_body.description
    json.dump(persona, open(PERSONA_FILE, 'w'), indent=4)
    return {"status": "success"}

if __name__ == "__main__":
    uvicorn.run("discussion:app", host="0.0.0.0", port=8000, reload=True)
