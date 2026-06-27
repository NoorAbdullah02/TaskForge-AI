import { useState, useRef, useEffect } from 'react';
import { askCopilot } from '../Services/aiApi';
import { useAuth } from '../context/AuthContext';
import {
    MessageSquare,
    X,
    Send,
    Sparkles,
    Loader,
    Bot,
    User,
    ChevronDown,
    Zap,
    CornerDownRight
} from 'lucide-react';
import toast from 'react-hot-toast';

const AICopilot = () => {
    const { isLoggedIn, user } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hi! I am your TaskForge Copilot. I have context about your active projects and task lists. How can I help you today?"
        }
    ]);
    const [inputValue, setInputValue] = useState('');
    const [loading, setLoading] = useState(false);

    const chatEndRef = useRef(null);
    const inputRef = useRef(null);

    // Scroll to bottom whenever messages list updates
    const scrollToBottom = () => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
            inputRef.current?.focus();
        }
    }, [messages, isOpen]);

    // Do not show Copilot if not logged in
    if (!isLoggedIn) return null;

    const handleSend = async (textToSend) => {
        const text = textToSend || inputValue.trim();
        if (!text) return;

        // Reset input field
        if (!textToSend) setInputValue('');

        // Append user message
        const userMsg = { role: 'user', content: text };
        setMessages(prev => [...prev, userMsg]);
        setLoading(true);

        try {
            // Build chat history context (exclude system prompts or format correctly)
            const chatHistory = messages.map(msg => ({
                role: msg.role,
                content: msg.content
            }));

            const data = await askCopilot(text, chatHistory);
            
            // Append assistant reply
            setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        } catch (err) {
            console.error('Copilot response error:', err);
            toast.error('Copilot had trouble connecting. Please try again.');
            setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I ran into an error processing that request. Please try again in a moment." }]);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const suggestedPrompts = [
        "What are my current projects?",
        "Show me my pending tasks",
        "Draft an update email for my active tasks",
        "Give me ideas to finish tasks quickly"
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50 font-sans">
            {/* 1. Chat Trigger Floating Action Button */}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-full flex items-center justify-center shadow-2xl hover:shadow-indigo-500/30 hover:scale-105 transition-all duration-200 group relative border border-line"
                >
                    <MessageSquare className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500 text-xxs font-extrabold shadow border border-white">
                        <Sparkles className="w-3 h-3 text-ink animate-pulse" />
                    </span>
                </button>
            )}

            {/* 2. Chat Widget Window Panel */}
            {isOpen && (
                <div className="w-[380px] sm:w-[400px] h-[550px] bg-white rounded-3xl shadow-2xl border border-gray-150 flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
                    
                    {/* Header bar */}
                    <div className="bg-gradient-to-r from-surface-2 to-surface-2 text-ink p-4 flex justify-between items-center shadow-sm">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center shadow border border-indigo-400">
                                <Bot className="w-5.5 h-5.5 text-ink" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-sm flex items-center gap-1">
                                    TaskForge Copilot
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                                </h3>
                                <p className="text-xxs text-ink-soft font-semibold flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block animate-ping"></span>
                                    Context Aware • Active
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-surface-2 rounded-lg transition-colors text-ink-soft hover:text-ink"
                            >
                                <ChevronDown className="w-5 h-5" />
                            </button>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1.5 hover:bg-surface-2 rounded-lg transition-colors text-ink-soft hover:text-ink"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Messages Body */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
                        {messages.map((msg, index) => {
                            const isAI = msg.role === 'assistant';
                            return (
                                <div
                                    key={index}
                                    className={`flex items-start gap-2.5 ${isAI ? 'justify-start' : 'justify-end'}`}
                                >
                                    {isAI && (
                                        <div className="w-8 h-8 bg-indigo-50 border border-indigo-150 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                                            <Bot className="w-4.5 h-4.5 text-indigo-600" />
                                        </div>
                                    )}

                                    <div
                                        className={`max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed font-semibold shadow-sm ${
                                            isAI
                                                ? 'bg-white text-ink-faint border border-gray-150 rounded-tl-none'
                                                : 'bg-indigo-600 text-white rounded-tr-none'
                                        }`}
                                    >
                                        <p className="whitespace-pre-wrap">{msg.content}</p>
                                    </div>

                                    {!isAI && (
                                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5 overflow-hidden shadow-sm border border-white">
                                            {user?.avatarUrl ? (
                                                <img src={user.avatarUrl.split('#')[0]} alt="Avatar" className="w-full h-full object-cover" />
                                            ) : (
                                                <span className="text-ink text-xxs font-bold">{user?.name?.charAt(0).toUpperCase()}</span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Suggestion Prompts */}
                        {messages.length === 1 && (
                            <div className="pt-2 space-y-2">
                                <p className="text-xxs font-bold text-ink-soft uppercase tracking-wider px-1.5 flex items-center gap-1">
                                    <Zap className="w-3.5 h-3.5 text-yellow-500" /> Suggested Prompts
                                </p>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {suggestedPrompts.map((prompt, i) => (
                                        <button
                                            key={i}
                                            onClick={() => handleSend(prompt)}
                                            className="w-full text-left p-2.5 bg-white border border-gray-200 hover:border-blue-300 rounded-xl text-xxs font-bold text-ink-faint hover:text-blue-600 transition flex items-center gap-1.5 group shadow-xxs"
                                        >
                                            <CornerDownRight className="w-3 h-3 text-ink-soft group-hover:text-blue-500 shrink-0" />
                                            {prompt}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Loading bubble */}
                        {loading && (
                            <div className="flex items-start gap-2.5 justify-start">
                                <div className="w-8 h-8 bg-indigo-50 border border-indigo-150 rounded-full flex items-center justify-center shrink-0 mt-0.5 animate-pulse">
                                    <Bot className="w-4.5 h-4.5 text-indigo-600" />
                                </div>
                                <div className="bg-white rounded-2xl rounded-tl-none p-3 shadow-sm border border-gray-150 flex items-center gap-1">
                                    <Loader className="w-4 h-4 text-indigo-600 animate-spin" />
                                    <span className="text-xxs font-bold text-ink0">Copilot is thinking...</span>
                                </div>
                            </div>
                        )}

                        <div ref={chatEndRef} />
                    </div>

                    {/* Footer Input Bar */}
                    <div className="p-3 border-t border-gray-200 bg-white flex gap-2 items-center">
                        <textarea
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask Copilot something..."
                            rows={1}
                            className="flex-1 px-3 py-2 border-2 border-gray-200 focus:border-blue-400 rounded-xl text-xs font-semibold focus:outline-none resize-none max-h-16"
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={loading || !inputValue.trim()}
                            className="w-9 h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center shadow transition shrink-0 disabled:opacity-50"
                        >
                            <Send className="w-4.5 h-4.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AICopilot;
