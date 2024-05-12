# import required module
import networkx
import matplotlib.pyplot as plt

# # create object
# G = networkx.complete_graph(5)
#
# # illustrate graph
# networkx.draw(G, node_color='green',
#               node_size=1500)
#
# # Display the graph using matplotlib
# plt.show()

import networkx as nx
import matplotlib.pyplot as plt
import numpy as np

# Number of nodes in the complete graph
num_nodes = 5

# Create a complete graph
G = nx.complete_graph(num_nodes)

# Assign random weights to each edge in the graph
for (u, v) in G.edges():
    G.edges[u, v]['weight'] = np.random.randint(1, 10)  # Random weights between 1 and 10

# Generate positions for each node using a layout (spring layout here)
pos = nx.spring_layout(G, weight=None)  # The layout might ignore the weights for visual presentation

# Draw the nodes
nx.draw_networkx_nodes(G, pos, node_color='skyblue', node_size=700)

# Draw the edges
edges = nx.draw_networkx_edges(G, pos)

# Label the nodes
nx.draw_networkx_labels(G, pos)

# Edge labels (weights)
edge_labels = nx.get_edge_attributes(G, 'weight')
nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels)

# Show the plot
plt.title("Fully Connected Graph with Random Weights")
plt.axis('off')  # Turn off the axis
plt.show()


import networkx as nx
import matplotlib.pyplot as plt
import numpy as np
import itertools

num_nodes = 5
G = nx.complete_graph(num_nodes)

values = itertools.cycle([1,1,1,1,1,9,9,9,9,9])
# Assign random weights to each edge in the graph
for (u, v) in G.edges():
    #temp = np.random.randint(1, 10)
    # print(temp)
    G.edges[u, v]['weight'] = next(values) # Random weights between 1 and 10

pos = nx.spring_layout(G)

# Draw nodes
nx.draw_networkx_nodes(G, pos, node_color='skyblue', node_size=700)

# Draw edges with widths proportional to weight
for (u, v, d) in G.edges(data=True):
    nx.draw_networkx_edges(G, pos, edgelist=[(u, v)], width=d['weight'] * 0.5)

# Labels
nx.draw_networkx_labels(G, pos)
edge_labels = nx.get_edge_attributes(G, 'weight')
nx.draw_networkx_edge_labels(G, pos, edge_labels=edge_labels)

plt.title("Fully Connected Graph with Edge Widths Proportional to Weights")
plt.axis('off')
plt.show()
