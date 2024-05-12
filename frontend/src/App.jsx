import React, {useState, useEffect, useRef} from "react";
import {
  MDBContainer,
  MDBRow,
  MDBCol,
  MDBCard,
  MDBCardBody,
  MDBBtn,
  MDBTypography,
  MDBTextArea,
  MDBCardHeader,
  MDBCheckbox,
  MDBPopover,
  MDBPopoverHeader,
  MDBPopoverBody,
  MDBCardTitle,
  MDBCardText,
  MDBModal,
  MDBModalDialog,
  MDBModalContent,
  MDBModalHeader,
  MDBModalTitle,
  MDBModalBody,
  MDBModalFooter,
} from "mdb-react-ui-kit";
import personas from './persona.json';
import DOMPurify from 'dompurify';

export default function App() {
  const [texts, setTexts] = useState([
    {
      user: 'Socrates',
      text: 'The only true wisdom is in knowing you know nothing.'
    },
    {
      user: 'Aristotle',
      text: 'It is the mark of an educated mind to be able to entertain a thought without accepting it.'
    },
    {
      user: 'Lawyer',
      text: 'The more you know, the more you realize you know nothing.'
    },
    {
      user: 'Socrates',
      text: 'The only true wisdom is in knowing you know nothing.'
    },
  ])
  const [agents, setAgents] = useState([])
  const [discussionStarted, setDiscussionStarted] = useState(false)
  const [activeAgents, setActiveAgents] = useState([])
  const [dilemma, setDilemma] = useState('')
  const messagesEndRef = useRef(null)
  const [round, setRounds] = useState(0)
  const [conclusion, setConclusion] = useState('Discussion in progress...')
  const [basicModal, setBasicModal] = useState(false);
  const [saveString, setSaveString] = useState('Save Changes');
  const toggleOpen = () => setBasicModal(!basicModal);
  const [customPersona, setCustomPersona] = useState({title: '', description: ''})
  const iframeRef = useRef(null);
  const [iframeContent, setIframeContent] = useState('');
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    // Collect all keys or desired data from personas
    const newAgents = [];
    for (const key in personas) {
      newAgents.push(key);  // assuming you want to store the key in agents
    }
    setAgents(newAgents);
    scrollToBottom();
    const iframe = iframeRef.current;
    if (iframe) {
        // Wait for the iframe to load
        iframe.onload = () => {
            const doc = iframe.contentDocument || iframe.contentWindow.document;
            // Scroll to the center of the iframe content
            const x = doc.body.scrollWidth / 2 - iframe.clientWidth / 2;
            const y = doc.body.scrollHeight / 2 - iframe.clientHeight / 2;
            iframe.contentWindow.scrollTo(x, y);
        };
    }
  }, [texts, conclusion, personas]);

  // useEffect(() => {
  //   setTimeout(() => {
  //     setIframeContent(`<html>\n    <head>\n        <meta charset=\"utf-8\">\n        \n            <script src=\"lib/bindings/utils.js\"></script>\n            <link rel=\"stylesheet\" href=\"https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.2/dist/dist/vis-network.min.css\" integrity=\"sha512-WgxfT5LWjfszlPHXRmBWHkV2eceiWTOBvrKCNbdgDYTHrT2AeLCGbF4sZlZw3UMN3WtL0tGUoIAKsu8mllg/XA==\" crossorigin=\"anonymous\" referrerpolicy=\"no-referrer\" />\n            <script src=\"https://cdnjs.cloudflare.com/ajax/libs/vis-network/9.1.2/dist/vis-network.min.js\" integrity=\"sha512-LnvoEWDFrqGHlHmDD2101OrLcbsfkrzoSpvtSQtxK3RMnRV0eOkhhBN2dXHKRrUU8p2DGRTk35n4O8nWSVe1mQ==\" crossorigin=\"anonymous\" referrerpolicy=\"no-referrer\"></script>\n            \n        \n<center>\n<h1></h1>\n</center>\n\n<!-- <link rel=\"stylesheet\" href=\"../node_modules/vis/dist/vis.min.css\" type=\"text/css\" />\n<script type=\"text/javascript\" src=\"../node_modules/vis/dist/vis.js\"> </script>-->\n        <link\n          href=\"https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta3/dist/css/bootstrap.min.css\"\n          rel=\"stylesheet\"\n          integrity=\"sha384-eOJMYsd53ii+scO/bJGFsiCZc+5NDVN2yr8+0RDqr0Ql0h+rP48ckxlpbzKgwra6\"\n          crossorigin=\"anonymous\"\n        />\n        <script\n          src=\"https://cdn.jsdelivr.net/npm/bootstrap@5.0.0-beta3/dist/js/bootstrap.bundle.min.js\"\n          integrity=\"sha384-JEW9xMcG8R+pH31jmWH6WWP0WintQrMb4s7ZOdauHnUtxwoG2vI5DkLtS3qm9Ekf\"\n          crossorigin=\"anonymous\"\n        ></script>\n\n\n        <center>\n          <h1></h1>\n        </center>\n        <style type=\"text/css\">\n\n             #mynetwork {\n                 width: 1900px;\n                 height: 900px;\n                 background-color: #222222;\n                 border: 1px solid lightgray;\n                 position: relative;\n                 float: left;\n             }\n\n             \n\n             \n\n             \n        </style>\n    </head>\n\n\n    <body>\n        <div class=\"card\" style=\"width: 100%\">\n            \n            \n            <div id=\"mynetwork\" class=\"card-body\"></div>\n        </div>\n\n        \n        \n\n        <script type=\"text/javascript\">\n\n              // initialize global variables.\n              var edges;\n              var nodes;\n              var allNodes;\n              var allEdges;\n              var nodeColors;\n              var originalNodes;\n              var network;\n              var container;\n              var options, data;\n              var filter = {\n                  item : '',\n                  property : '',\n                  value : []\n              };\n\n              \n\n              \n\n              // This method is responsible for drawing the graph, returns the drawn network\n              function drawGraph() {\n                  var container = document.getElementById('mynetwork');\n\n                  \n\n                  // parsing and collecting nodes and edges from the python\n                  nodes = new vis.DataSet([{\"color\": \"#97c2fc\", \"font\": {\"color\": \"white\"}, \"id\": \"Confucius\", \"image\": \"/Users/adas/codingProjects/LlamaSage/frontend/public/thumbnails/Confucius.png\", \"label\": \"Confucius\", \"shape\": \"image\"}, {\"color\": \"#97c2fc\", \"font\": {\"color\": \"white\"}, \"id\": \"Nelson Mandela\", \"image\": \"/Users/adas/codingProjects/LlamaSage/frontend/public/thumbnails/Nelson Mandela.png\", \"label\": \"Nelson Mandela\", \"shape\": \"image\"}, {\"color\": \"#97c2fc\", \"font\": {\"color\": \"white\"}, \"id\": \"consensus\", \"image\": \"/Users/adas/codingProjects/LlamaSage/frontend/public/thumbnails/consensus.png\", \"label\": \"consensus\", \"shape\": \"image\"}]);\n                  edges = new vis.DataSet([{\"color\": \"#d57eeb\", \"from\": \"Confucius\", \"to\": \"Nelson Mandela\", \"width\": 8}, {\"color\": \"#d57eeb\", \"from\": \"Confucius\", \"to\": \"consensus\", \"width\": 29}, {\"color\": \"#d57eeb\", \"from\": \"Nelson Mandela\", \"to\": \"consensus\", \"width\": 29}]);\n\n                  nodeColors = {};\n                  allNodes = nodes.get({ returnType: \"Object\" });\n                  for (nodeId in allNodes) {\n                    nodeColors[nodeId] = allNodes[nodeId].color;\n                  }\n                  allEdges = edges.get({ returnType: \"Object\" });\n                  // adding nodes and edges to the graph\n                  data = {nodes: nodes, edges: edges};\n\n                  var options = {\n    \"configure\": {\n        \"enabled\": false\n    },\n    \"edges\": {\n        \"color\": {\n            \"inherit\": true\n        },\n        \"smooth\": {\n            \"enabled\": true,\n            \"type\": \"dynamic\"\n        }\n    },\n    \"interaction\": {\n        \"dragNodes\": true,\n        \"hideEdgesOnDrag\": false,\n        \"hideNodesOnDrag\": false\n    },\n    \"physics\": {\n        \"enabled\": true,\n        \"repulsion\": {\n            \"centralGravity\": 0.2,\n            \"damping\": 0.09,\n            \"nodeDistance\": 100,\n            \"springConstant\": 0.05,\n            \"springLength\": 200\n        },\n        \"solver\": \"repulsion\",\n        \"stabilization\": {\n            \"enabled\": true,\n            \"fit\": true,\n            \"iterations\": 1000,\n            \"onlyDynamicEdges\": false,\n            \"updateInterval\": 50\n        }\n    }\n};\n\n                  \n\n\n                  \n\n                  network = new vis.Network(container, data, options);\n\n                  \n\n                  \n\n                  \n\n\n                  \n\n                  return network;\n\n              }\n              drawGraph();\n        </script>\n    </body>\n</html>`);
  //   }, 10000);
  // }, []);


  useEffect(() => {
    if (!iframeRef.current) return;
    const iframe = iframeRef.current;
    iframe.srcdoc = iframeContent;
  }, [iframeContent]);

  const startDiscussion = () => {
    setConclusion('Discussion in progress...')
    setDiscussionStarted(true);
    setTexts([]);
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        "question": dilemma,
        "rounds": 2,
        "agents": activeAgents
      })
    };
    
    fetch('http://0.0.0.0:8000/debate', requestOptions)
      .then(response => {
        const reader = response.body.getReader();
        return new ReadableStream({
          start(controller) {
            function push() {
              reader.read().then(({ done, value }) => {
                updateGraph();
                setRounds(round + 1)
                if (done) {
                  controller.close();
                  return;
                }

                // Parse the data chunk and convert it to text
                const text = new TextDecoder().decode(value);
                const data = JSON.parse(text);
                if(data.final_consensus) {
                  setConclusion(data.final_consensus)
                  return;
                }
                // loop through data array
                data.forEach((element, index) => {
                  setTimeout(() => {
                    setTexts(prevTexts => [...prevTexts, {user: Object.keys(element)[0], text: element[Object.keys(element)[0]]}]);
                  }, 2000 * (index + round));
                });

                controller.enqueue(value);
                push();
              }).catch(error => {
                console.error('Error while reading the stream:', error);
                controller.error(error);
              });
            }

            push();
          }
        });
      })
      .catch(error => {
        console.error('Failed to fetch:', error);
      });
  }

  const updateGraph = () => {
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    
    fetch('http://0.0.0.0:8000/graph', requestOptions)
      .then(response => {
        const reader = response.body.getReader();
        return new ReadableStream({
          start(controller) {
            function push() {
              reader.read().then(({ done, value }) => {
                if (done) {
                  controller.close();
                  return;
                }
                // Parse the data chunk and convert it to text
                const text = new TextDecoder().decode(value);
                let convertedHtml = text
                  .replace(/\\n/g, "\n") // Replace escaped newlines with actual newlines
                  .replace(/\\"/g, '"'); // Replace escaped quotes with actual quotes
                setIframeContent(convertedHtml);
                controller.enqueue(value);
                push();
              }).catch(error => {
                console.error('Error while reading the stream:', error);
                controller.error(error);
              });
            }
            push();
          }
        });
      })
  }

  const handleChange = (e, value) => {
    if(e.target.checked){
      const newActiveAgents = [...activeAgents, value]
      setActiveAgents(newActiveAgents)
    } else {
      const newActiveAgents = activeAgents.filter(agent => agent !== value)
      setActiveAgents(newActiveAgents)
    }
  }

  const chunkArray = (arr, chunkSize) => {
    let result = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
      result.push(arr.slice(i, i + chunkSize));
    }
    return result;
  };

  const updatePersonasJson = () => {
    setSaveString('Saving...')
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        "name": customPersona.title,
        "description": customPersona.description,
      })
    };
    fetch('http://0.0.0.0:8000/add_persona', requestOptions)
      .then(response => {
        setBasicModal(false);
        setSaveString('Save Changes');
      });
  }

  const getSourceImage = (agentName) => {
    try{
      return require(`./thumbnails/${agentName}.png`)
    } catch {
      return require(`./thumbnails/default.png`)
    }
  }

  return (
    <MDBContainer fluid className="py-3 gradient-custom">
      <MDBRow className="text-center mb-3">
        <h1 >
          LlamaSage
        </h1>
      </MDBRow>
      <MDBRow className="mb-2">
          <MDBCol size='6'>
              <MDBTextArea className="mb-2" label="Dilemma to ponder" id="textAreaExample" rows={5} onChange={(e)=>setDilemma(e.target.value)} />
          </MDBCol>
          <MDBCol size='6'>
            <MDBRow>
              <h6>Select agents for participation</h6>
            </MDBRow>
            <MDBRow>
              {chunkArray(agents, 4).map((value, index) => {
                return (
                  <MDBCol size='4'>
                    <div className="d-flex flex-row">
                        <img
                           src={getSourceImage(value[0])}
                          className='img-fluid rounded-circle'
                          style={{height: '25px', width: '25px',marginRight: '5px'}}
                          alt=''
                        />
                        <MDBCheckbox label={value[0]} key={index*3 + 0} onChange={e => handleChange(e, value[0])}/>
                        <MDBPopover dismiss color='secondary' btnChildren='?' placement='top' style={{ height: '15px', width: '15px', padding: '0px', marginLeft: '5px'}}>
                          <MDBPopoverHeader>{value[0]}</MDBPopoverHeader>
                          <MDBPopoverBody>{personas[value[0]]}</MDBPopoverBody>
                        </MDBPopover>
                      </div>
                      {1<value.length && <div className="d-flex flex-row">
                        <img
                           src={getSourceImage(value[1])}
                          className='img-fluid rounded-circle'
                          style={{height: '25px', width: '25px',marginRight: '5px'}}
                          alt=''
                        />
                        <MDBCheckbox label={value[1]} key={index*3 + 1} onChange={e => handleChange(e, value[1])}/>
                        <MDBPopover dismiss color='secondary' btnChildren='?' placement='top' style={{ height: '15px', width: '15px', padding: '0px', marginLeft: '5px'}}>
                          <MDBPopoverHeader>{value[1]}</MDBPopoverHeader>
                          <MDBPopoverBody>{personas[value[1]]}</MDBPopoverBody>
                        </MDBPopover>
                    </div>}
                    {2 < value.length && <div className="d-flex flex-row">
                      <img
                         src={getSourceImage(value[2])}
                        className='img-fluid rounded-circle'
                        style={{height: '25px', width: '25px',marginRight: '5px'}}
                        alt=''
                      />
                      <MDBCheckbox label={value[2]} key={index*3 + 2} onChange={e => handleChange(e, value[2])}/>
                      <MDBPopover dismiss color='secondary' btnChildren='?' placement='top' style={{ height: '15px', width: '15px', padding: '0px', marginLeft: '5px'}}>
                        <MDBPopoverHeader>{value[2]}</MDBPopoverHeader>
                        <MDBPopoverBody>{personas[value[2]]}</MDBPopoverBody>
                      </MDBPopover>
                    </div>}
                    {3 < value.length && <div className="d-flex flex-row">
                      <img
                         src={getSourceImage(value[3])}
                        className='img-fluid rounded-circle'
                        style={{height: '25px', width: '25px',marginRight: '5px'}}
                        alt=''
                      />
                      <MDBCheckbox label={value[3]} key={index*3 + 2} onChange={e => handleChange(e, value[2])}/>
                      <MDBPopover dismiss color='secondary' btnChildren='?' placement='top' style={{ height: '15px', width: '15px', padding: '0px', marginLeft: '5px'}}>
                        <MDBPopoverHeader>{value[3]}</MDBPopoverHeader>
                        <MDBPopoverBody>{personas[value[3]]}</MDBPopoverBody>
                      </MDBPopover>
                    </div>}
                  </MDBCol>)
              })}
            </MDBRow>
          </MDBCol>
      </MDBRow>
      <MDBRow className="text-center mb-2">
        <MDBTypography>
          <MDBBtn style={{marginRight: '20px'}} color="light" size="lg" rounded onClick={event => startDiscussion()}>
            Start Discussion
          </MDBBtn>
          <MDBBtn color="light" size="lg" rounded onClick={toggleOpen}>Add custom persona</MDBBtn>
          <MDBModal open={basicModal} onClose={() => setBasicModal(false)} tabIndex='-1'>
            <MDBModalDialog>
              <MDBModalContent>
                <MDBModalHeader>
                  <MDBModalTitle>Add custom persona</MDBModalTitle>
                  <MDBBtn className='btn-close' color='none' onClick={toggleOpen}></MDBBtn>
                </MDBModalHeader>
                <MDBModalBody>
                  <MDBTextArea className="mb-3" label="Persona Title" rows={1} onChange={(e)=> setCustomPersona(persona => {
                    return {...persona, 'title': e.target.value}
                    })} />
                  <MDBTextArea label="Persona Short Description" rows={4} onChange={(e)=>setCustomPersona(persona => {
                    return {...persona, 'description': e.target.value}
                    })} />
                </MDBModalBody>

                <MDBModalFooter>
                  <MDBBtn color="success" onClick={()=>updatePersonasJson()}>{saveString}</MDBBtn>
                </MDBModalFooter>
              </MDBModalContent>
            </MDBModalDialog>
          </MDBModal>

        </MDBTypography>
      </MDBRow>
      {discussionStarted && <MDBRow>
        <MDBCol size='8' style={{ height: '630px', overflow: 'scroll' }}>
          <MDBTypography>
          {texts.map((value, index) => {
            return <li className="d-flex justify-content-between mb-4" key={index}>
              <img
                src={getSourceImage(value.user)}
                alt="avatar"
                className="rounded-circle d-flex align-self-start me-3 shadow-1-strong"
                width="60"
              />
              <MDBCard className="w-100 mask-custom">
                <MDBCardHeader
                  className="d-flex justify-content-between p-3"
                >
                  <p className="fw-bold mb-0">{value.user}</p>
                </MDBCardHeader>
                <MDBCardBody>
                  <p className="mb-0">
                    {value.text}
                  </p>
                </MDBCardBody>
              </MDBCard>
            </li>
          })}
          <div ref={messagesEndRef} />
          </MDBTypography>
        </MDBCol>
        <MDBCol size='4'>
          <iframe ref={iframeRef} style={{width: '100%', height: '65%'}}></iframe>
          <MDBCard style={{height: '35%'}}>
            <MDBCardBody>
              <MDBCardTitle>Conclusion</MDBCardTitle>
              <MDBCardText>
                {conclusion}
              </MDBCardText>
            </MDBCardBody>
          </MDBCard>
        </MDBCol>
      </MDBRow>}
    </MDBContainer>
  );
}