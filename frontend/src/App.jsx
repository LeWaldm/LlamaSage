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
                  console.log('Final consensus:', data.summary)
                  data.summary.forEach((element, index) => {
                    setTimeout(() => {
                      setTexts(prevTexts => [...prevTexts, {user: Object.keys(element)[0], text: element[Object.keys(element)[0]]}]);
                    }, 2000 * (index + round));
                  })
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
      if (activeAgents.includes(value)) return 
      const newActiveAgents = [...activeAgents, value]
      setActiveAgents(newActiveAgents)
    } else {
      if (!activeAgents.includes(value)) return
      const newActiveAgents = activeAgents.filter(agent => agent !== value)
      setActiveAgents(newActiveAgents)
    }
    console.log('active agents:', activeAgents)
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
      return require(`./thumbnails/Default.png`)
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
                      <MDBCheckbox label={value[3]} key={index*3 + 2} onChange={e => handleChange(e, value[3])}/>
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
        <MDBCheckbox className="mb-3" name='inlineCheck' id='inlineCheckbox1' value='option1' label='Check the Internet' inline />
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
        <MDBCol size='8' style={{ height: '640px', overflow: 'scroll' }}>
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
          <iframe ref={iframeRef} style={{width: '100%', height: '64%'}}></iframe>
          <MDBCard style={{height: '37%'}}>
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