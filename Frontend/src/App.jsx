import { useState } from 'react';
import axios from "axios";
import "./styling/App.css";
import "./styling/index.css";

function App() {
  const [selectedFile, setSelectedFile] = useState(null); // UseState hook for managing current file selection
  const [loading, setLoading] = useState(false); // Trigger loading ui 
  const [feedback, setFeedback] = useState(null); // Contains feedback from AI API


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

    setLoading(true); // Set loading to true
    setFeedback(null); // Reset feedback incase this is a second search

    const formData = new FormData();
    formData.append(
      "image",
      selectedFile,
      selectedFile.name
    );
    console.log(selectedFile); // debug purposes
    
    try {
      // simulate backend call with delay (fake AI analysis)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const response = await axios.post(
        "http://localhost:5000/analyze", // or /analyze later
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        }
      );

      console.log(response.data); // shows { message: "...", file: {...} }
      setFeedback(response.data.feedbackDetails); // store message in state

    } catch (err) {
      console.error(err);
      alert("Error uploading file");
    } finally {
      setLoading(false); // stop loading
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
      const strengths = feedbackDetails.Strengths || []; // array
      const weaknesses = feedbackDetails.Weaknesses || []; // array
      const tips = feedbackDetails.Tips || []; // array

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
      <div className="uploadCard">
        <h1 className="Title">Welcome to the Art AI Feedback Tool, please select an image to upload!</h1>
        <div className="uploadDiv">
          <input type="file" id="fileUpload" accept="image/*" onChange={onFileChange} style={{ display: "none" }}/>
          <label htmlFor="fileUpload" className="customButton">
            Choose File
          </label>
          <button onClick={onFileUpload} disabled={loading}>Upload!</button>
        </div>
        <div className="ImagePreview">
          <FileData className="fileData"/>
        </div>
        <div className="Feedback">
          <Feedback feedbackDetails={feedback}/>
        </div>
      </div>
    </>
  )
}

export default App
