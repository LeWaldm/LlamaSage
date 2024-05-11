import json
from groq import Groq
import os
from dotenv import load_dotenv

GROQ_MODEL = 'llama3-70b-8192'

"""
modes
- sequential: agents are ordered in a sequence
- parallel (similar to shared paper)

"""



def construct_message(agent_ids, contexts, question, idx):
    if len(agents) == 0:
        return {"role": "user", "content": "Can you double check that your answer is correct. Put your final answer in the form (X) at the end of your response."}

    prefix_string = "These are the solutions to the problem from other agents: "

    for id, context in zip(agent_ids, contexts):
        agent_response = context[idx]["content"]
        response = f"\n\n The solution from {id} is: ```{agent_response}```"
        prefix_string = prefix_string + response

    prefix_string = prefix_string + """\n\n Using the reasoning from other agents as additional advice, can you give an updated answer? Examine your solution and that other agents step by step. Put your answer in the form (X) at the end of your response.""".format(question)
    return {"role": "user", "content": prefix_string}



def main(question, agent_ids, rounds):

    # setup
    persona = json.load(open('persona.json'))
    load_dotenv()
    client = Groq(
        api_key = os.environ.get("GROQ_API_KEY"),
    )


    # setup initial context
    agent_contexts = []
    for a in agent_ids:
        agent_contexts.append([
            {"role": "system", "content": persona[a]["context"]},
            {"role": "user", "content": question}
        ])

    # question loop 
    mode = 'only_previous_round'
    if mode == 'only_previous_round':
        for round in range(rounds):
            for i, agent_context in enumerate(agent_contexts):

                if round != 0:
                    agent_contexts_other = agent_contexts[:i] + agent_contexts[i+1:]
                    agent_ids_other = agent_ids[:i] + agent_ids[i+1:]
                    message = construct_message(agent_ids_other, agent_contexts_other, question, 2 * round - 1)
                    agent_context.append(message)

                # generate answer
                answer_context = agent_context
                completion = client.chat.completions.create(
                    model=GROQ_MODEL,
                    messages=answer_context,
                    n=1)

                # construct assitant message
                content = completion.choices[0].message.content
                assistant_message = {"role": "assistant", "content": content}
                agent_context.append(assistant_message)
                print(completion)
    else:
        raise KeyError(f"mode {mode} not implemented")

if __name__ == "__main__":

    rounds = 2
    question = 'What is the meaning of life?'
    agents = ['Kant', 'Hume']
    main(question, agents, rounds)
