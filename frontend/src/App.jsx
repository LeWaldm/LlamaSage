import React, {useState} from "react";
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
  const [agents, setAgents] = useState([
    'Socrates', 'Lawyer', 'Aristotle'
  ])
  const [discussionStarted, setDiscussionStarted] = useState(false)

  const startDiscussion = () => {
    setDiscussionStarted(true)
  }
  return (
    <MDBContainer fluid className="py-5 gradient-custom">
      <MDBRow className="text-center mb-3">
        <h1 >
          LlamaSage
        </h1>
      </MDBRow>
      <MDBRow className="mb-3">
          <MDBCol size='9'>
              <MDBTextArea className="mb-3" label="Dilemma to ponder" id="textAreaExample" rows={4} />
          </MDBCol>
          <MDBCol size='3'>
            <h5>Select agents for participation</h5>
            <MDBCheckbox label="Socrates" id="checkbox1" />
            <MDBCheckbox label="Lawyer" id="checkbox1" />
            <MDBCheckbox label="Aristotle" id="checkbox1" />
          </MDBCol>
      </MDBRow>
      <MDBRow className="text-center mb-3">
        <MDBTypography>
          <MDBBtn color="light" size="lg" rounded onClick={event => startDiscussion()}>
            Start Discussion
          </MDBBtn>
        </MDBTypography>
      </MDBRow>
      {<MDBRow>
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
      </MDBRow>}
    </MDBContainer>
  );
}