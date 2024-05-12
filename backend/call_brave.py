import json

import requests

def ask_the_internet(query_info):
    api_key = "BSAMz4pp1rNzpePN6ODc0U3jhLp_q0P"

    # Set the headers
    headers = {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': api_key
    }

    # Make the request
    response = requests.get(f'https://api.search.brave.com/res/v1/web/search?q={query_info}', headers=headers)

    # Check if the request was successful
    if response.status_code == 200:
        # Parse JSON response
        data = response.json()
        print(json.dumps(data['web']['results'][0]['extra_snippets'][0], indent=4))
    else:
        print("Failed to fetch data:", response.status_code)

query_info = "What is the capital of San Francisco?"
ask_the_internet(query_info)