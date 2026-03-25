import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User } from 'lucide-react';
import axiosInstance from '../api/axiosInstance';
import useAuthStore from '../store/authStore';
import './ChatPage.css';

const API_BASE = '/api/chat';

const ChatPage = () => {
  const { user, userProfile, setDietPlan, setWorkoutPlan, setReminders, reminders, pendingChatMessage, setPendingChatMessage } = useAuthStore();
  
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Pre-fill from "Ask JimBro" button in other pages
  useEffect(() => {
    if (pendingChatMessage) {
      setInput(pendingChatMessage);
      setPendingChatMessage(null);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {

    try {
      const res = await axiosInstance.get(`${API_BASE}/history/${user.id}`);
      setMessages(res.data);
    } catch (err) {
      console.error('Failed to load history', err);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !user) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: userMsg, timestamp: new Date().toISOString() },
    ]);

    setLoading(true);
    try {
      let userContext = ``;
      if (userProfile?.height) {
        userContext = `Athlete stats: ${userProfile.age}yo ${userProfile.gender}, ${userProfile.height}cm, ${userProfile.weight}kg. Goal: ${userProfile.goal}. Level: ${userProfile.fitnessLevel}.`;
      } else {
        userContext = `The user hasn't set their stats yet. Give general advice.`;
      }

      const res = await axiosInstance.post(`${API_BASE}/send`, {
        userId: user.id,
        message: userMsg,
        userContext: userContext
      });

      setMessages((prev) => [
        ...prev,
        { role: 'model', content: res.data.message, timestamp: new Date().toISOString() },
      ]);
      
      // Parse Raw Agentic Actions
      if (res.data.rawActions && Array.isArray(res.data.rawActions)) {
        res.data.rawActions.forEach(action => {
          if (action.type === 'UPDATE_DIET' && action.value) {
            // value may be an object (structured JSON) or a string — always store as JSON string
            const planStr = typeof action.value === 'string' ? action.value : JSON.stringify(action.value);
            setDietPlan(planStr);
            console.log('✅ Diet Plan updated by JimBro');
          }
          if (action.type === 'UPDATE_WORKOUT' && action.value) {
            const planStr = typeof action.value === 'string' ? action.value : JSON.stringify(action.value);
            setWorkoutPlan(planStr);
            console.log('✅ Workout Plan updated by JimBro');
          }
          if (action.type === 'ADD_REMINDER' && action.value) {
            const nextId = Date.now() + Math.floor(Math.random() * 100);
            const text = typeof action.value === 'string' ? action.value : String(action.value);
            setReminders([...reminders, { id: nextId, text, done: false }]);
          }
        });
      }
    } catch (err) {
      console.error('Chat error', err);
      setMessages((prev) => [
        ...prev,
        { role: 'model', content: 'Connection failed bro. Check network.', timestamp: new Date().toISOString() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <Bot size={24} className="chat-header-icon" />
        <div>
          <h2 className="chat-header-title">JimBro AI</h2>
          <p className="chat-header-subtitle">Your personal fitness companion</p>
        </div>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-empty">
            <Bot size={48} className="chat-empty-icon" />
            <h3>Sup bro! Ready to crush it?</h3>
            <p>Tell me what you want to change in your workout or diet plan, or log a session!</p>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-bubble-container ${msg.role}`}>
            <div className={`chat-bubble ${msg.role}`}>
              {msg.role === 'model' ? <Bot size={16} className="bubble-icon" /> : <User size={16} className="bubble-icon" />}
              <div className="chat-content">{msg.content}</div>
            </div>
            <div className="chat-timestamp">
              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        {loading && (
          <div className="chat-bubble-container model">
             <div className="chat-bubble model typing">JimBro is typing...</div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-input-area" onSubmit={handleSend}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask JimBro to update your plan or log a workout..."
          className="chat-input"
          disabled={loading}
        />
        <button type="submit" className="chat-send-btn" disabled={!input.trim() || loading}>
          <Send size={20} />
        </button>
      </form>
    </div>
  );
};

export default ChatPage;
