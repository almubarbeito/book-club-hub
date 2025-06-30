// This is the CORRECT code for your file: src/App.tsx

import React, { useState } from 'react';
import './App.css'; // Or your own CSS file

function App() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('Waiting for your prompt...');
  const [isLoading, setIsLoading] = useState(false);

  // This function will be called when the form is submitted
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt) {
      alert('Please enter a prompt.');
      return;
    }

    setIsLoading(true);
    setResponse('Generating...');

    try {
      // This is the key part: it calls YOUR backend function
      const res = await fetch('/.netlify/functions/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send the user's prompt in the request body
        body: JSON.stringify({ prompt: prompt }),
      });

      if (!res.ok) {
        // If the server responded with an error, throw an error
        throw new Error(`Server error: ${res.status}`);
      }

      // Get the JSON response from your backend function
      const data = await res.json();
      
      // Update the state with the AI's response
      setResponse(data.response);

    } catch (error) {
      console.error('Error fetching AI response:', error);
      setResponse('Sorry, an error occurred on our end. Please try again.');
    } finally {
      // Make sure the loading state is turned off
      setIsLoading(false);
    }
  };

  return (
    <div className="App">
      <h1>My AI App</h1>
      <form onSubmit={handleSubmit}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g., Write a story about a magic backpack"
          rows={4}
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Generating...' : 'Generate'}
        </button>
      </form>

      <h3>AI Response:</h3>
      <pre className="response-box">
        {response}
      </pre>
    </div>
  );
}

export default App;