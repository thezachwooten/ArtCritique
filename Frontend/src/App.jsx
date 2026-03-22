import { useState } from 'react';
import axios from "axios";
import { 
  SignedIn, 
  SignedOut, 
  SignInButton, 
  SignUpButton, 
  UserButton, 
  useAuth 
} from '@clerk/clerk-react';
import "./styling/App.css";
import "./styling/index.css";

function App() {
  const [selectedFile, setSelectedFile] = useState(null); // UseState hook for managing current file selection
  const [loading, setLoading] = useState(false); // Trigger loading ui 
  const [feedback, setFeedback] = useState(null); // Contains feedback from AI API

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

  // Inside your App function:
  const { getToken } = useAuth();


  // File change event
  const onFileChange = (event) => {
    setSelectedFile(event.target.files[0]);
  };

  // File upload: ASYNC
  const onFileUpload = async () => {
  if (!selectedFile) {
    alert("Please select a file first!");
    return;
  }

  setLoading(true);
  setFeedback(null);

  try {
    // 1. Get the session token from Clerk
    const token = await getToken();

    const formData = new FormData();
    formData.append("image", selectedFile, selectedFile.name);

    // 2. Pass the token in the Authorization header
    const response = await axios.post(
      `${BACKEND_URL}/analyze`,
      formData,
      {
        headers: { 
          "Content-Type": "multipart/form-data",
          "Authorization": `Bearer ${token}` // <--- THE KEY ADDITION
        },
      }
    );

    setFeedback(response.data.feedbackDetails);
  } catch (err) {
    console.error(err);
    alert(err.response?.status === 401 ? "Please sign in first!" : "Error uploading file");
  } finally {
    setLoading(false);
    }
  };

  // Display file data component
  const FileData = () => {
    if (loading){
      return <div className="spinner"></div>;
    }
    else if (selectedFile) {
      return (
        <div className="filePreview">
          <h2>File Preview:</h2>
          <img src={URL.createObjectURL(selectedFile)} alt="preview" />
        </div>
      );
    } else {
      return (
        <div className="filePreview">
					<br />
					<h4>Choose before Pressing the Upload button</h4>
				</div>
      );
    }
  };

  // Display feedback
  const Feedback = (props) => {
    const feedbackDetails = props.feedbackDetails; // JSON obj
    if (feedbackDetails === null){
      return (
      <>
      </>
    );
    } else {
      const strengths = feedbackDetails.strengths || []; // array
      const weaknesses = feedbackDetails.weaknesses || []; // array
      const tips = feedbackDetails.tips || []; // array

      return (
        <div>
          <h1 className="feedbackTitle">AI Feedback</h1>
          <h2>Rating: {feedbackDetails.rating}</h2>
          <h2>Strengths</h2>
          <ul className='strengths'>
            {strengths.map((strength, index) => 
              <li key={index}>{strength}</li>
            )}
          </ul>
          <h2>Weaknesses</h2>
          <ul className="weaknesses">
            {weaknesses.map((weakness, index) => 
              <li key={index}>{weakness}</li>
             )}
          </ul>
          <h2>Tips</h2>
          <ul className="tips">
            {tips.map((tip, index) =>
              <li key={index}>{tip}</li>
            )}
          </ul>
        </div>
      );
    }
    
  }

 return (
    <>
      <main className="main-content">
        {/* VIEW 1: Shown ONLY when the user is logged out */}
        <SignedOut>
          <div className="welcome-container">
            <h1>Master Your Art with AI</h1>
            <p>Get professional-grade critiques on your sketches and paintings instantly.</p>
            <div className="hero-buttons">
              <SignInButton mode="modal">
                <button className="large-button">Sign In to Get Started</button>
              </SignInButton>
            </div>
          </div>
        </SignedOut>

        {/* VIEW 2: Shown ONLY when the user is logged in */}
        <SignedIn>
          <div className="uploadCard">
            <h1 className="Title">Welcome! Select an image to get started.</h1>
            
            <div className="uploadDiv">
              <input 
                type="file" 
                id="fileUpload" 
                accept="image/*" 
                onChange={onFileChange} 
                style={{ display: "none" }}
              />
              <label htmlFor="fileUpload" className="customButton">
                Choose File
              </label>
              <button 
                className="upload-btn" 
                onClick={onFileUpload} 
                disabled={loading}
              >
                {loading ? "Analyzing..." : "Upload & Analyze"}
              </button>
            </div>

            <div className="ImagePreview">
              <FileData className="fileData"/>
            </div>

            <div className="Feedback">
              <Feedback feedbackDetails={feedback}/>
            </div>
          </div>
        </SignedIn>
      </main>
    </>
  );
}

export default App
