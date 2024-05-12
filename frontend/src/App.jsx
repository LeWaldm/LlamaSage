import React, {useState, useEffect} from "react";
import {
  MDBContainer,
  MDBRow,
  MDBCol,
  MDBCard,
  MDBCardBody,
  MDBIcon,
  MDBBtn,
  MDBTypography,
  MDBTextArea,
  MDBCardHeader,
  MDBCheckbox
} from "mdb-react-ui-kit";
import personas from './persona.json';

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

  useEffect(() => {  
    // Collect all keys or desired data from personas
    const newAgents = [];
    for (const key in personas) {
      newAgents.push(key);  // assuming you want to store the key in agents
    }
  
    // Set the new state once after the loop
    setAgents(newAgents);
  }, []);  // Empty dependency array ensures this effect runs only once after the initial render
  

  const startDiscussion = () => {
    const requestOptions = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        "question": "What is the meaning of life?",
        "rounds": 2,
        "agents": ["Immanuel Kant", "Lawyer"]
    })
    };
    fetch('http://0.0.0.0:8000/debate', requestOptions)
        .then(response => response.json())
        .then(data => {
          console.log('aniket', data);
        });
    setDiscussionStarted(true)
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

  return (
    <MDBContainer fluid className="py-5 gradient-custom">
      <MDBRow className="text-center mb-3">
        <h1 >
          LlamaSage
        </h1>
      </MDBRow>
      <MDBRow className="mb-3">
          <MDBCol size='6'>
              <MDBTextArea className="mb-3" label="Dilemma to ponder" id="textAreaExample" rows={7} onChange={(e)=>setDilemma(e.target.value)} />
          </MDBCol>
          <MDBCol size='6'>
            <MDBRow>
              <h6>Select agents for participation</h6>
            </MDBRow>
            <MDBRow>
              {chunkArray(agents, 3).map((value, index) => {
                return (
                  <MDBCol size='3'>
                    <MDBCheckbox label={value[0]} key={index*3 + 0} onChange={e => handleChange(e, value[0])}/>
                    <MDBCheckbox label={value[1]} key={index*3 + 1} onChange={e => handleChange(e, value[1])}/>
                    <MDBCheckbox label={value[2]} key={index*3 + 2} onChange={e => handleChange(e, value[2])}/>
                  </MDBCol>)
              })}
            </MDBRow>
          </MDBCol>
      </MDBRow>
      <MDBRow className="text-center mb-3">
        <MDBTypography>
          <MDBBtn color="light" size="lg" rounded onClick={event => startDiscussion()}>
            Start Discussion
          </MDBBtn>
        </MDBTypography>
      </MDBRow>
      <MDBRow style={{ height: '500px', overflow: 'scroll' }}>
          <MDBTypography>
          {discussionStarted && texts.map((value, index) => {
            return <li className="d-flex justify-content-between mb-4" key={index}>
              <img
                src="https://mdbcdn.b-cdn.net/img/Photos/Avatars/avatar-6.webp"
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
          </MDBTypography>
      </MDBRow>
    </MDBContainer>
  );
}