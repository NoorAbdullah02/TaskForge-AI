import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { getRooms, createRoom, getMessages, sendMessage } from '../Services/chatApi';
import { getWorkspaceMembers } from '../Services/workspaceApi';
import { socket, connectSocket } from '../Services/socket';
import { MessageSquare, Users, Send, Hash, User, Loader2, Plus, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';

const ChatHub = () => {
    const { user } = useAuth();
    const [rooms, setRooms] = useState([]);
    const [members, setMembers] = useState([]);
    const [selectedRoom, setSelectedRoom] = useState(null);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [loadingRooms, setLoadingRooms] = useState(true);
    const [loadingMessages, setLoadingMessages] = useState(false);
    const [showNewRoomModal, setShowNewRoomModal] = useState(false);
    
    // New Room states
    const [newRoomName, setNewRoomName] = useState('');
    const [newRoomType, setNewRoomType] = useState('group'); // group or direct
    const [selectedMemberId, setSelectedMemberId] = useState('');

    const messagesEndRef = useRef(null);

    // 1. Connect socket and join rooms
    useEffect(() => {
        if (user?.id) {
            connectSocket(user.id);
        }
    }, [user]);

    // 2. Fetch Rooms & Members
    const loadHubData = async () => {
        try {
            setLoadingRooms(true);
            const [roomsList, membersList] = await Promise.all([
                getRooms(),
                getWorkspaceMembers()
            ]);
            setRooms(roomsList || []);
            setMembers(membersList || []);
            
            // Auto select first room if available
            if (roomsList && roomsList.length > 0) {
                handleSelectRoom(roomsList[0]);
            }
        } catch (error) {
            console.error('Failed to load chat hub data:', error);
            toast.error('Could not retrieve workspace chat channels.');
        } finally {
            setLoadingRooms(false);
        }
    };

    useEffect(() => {
        loadHubData();
    }, [user?.activeWorkspaceId]);

    // 3. Socket event listener for real-time messages
    useEffect(() => {
        const handleNewMessage = (msg) => {
            if (selectedRoom && msg.chatId === selectedRoom.id) {
                setMessages(prev => [...prev, msg]);
            }
            // Update last message in the room list
            setRooms(prevRooms => prevRooms.map(r => {
                if (r.id === msg.chatId) {
                    return {
                        ...r,
                        lastMessage: {
                            content: msg.content,
                            createdAt: msg.createdAt,
                            senderName: msg.senderName
                        }
                    };
                }
                return r;
            }));
        };

        socket.on('new_message', handleNewMessage);

        return () => {
            socket.off('new_message', handleNewMessage);
        };
    }, [selectedRoom]);

    // Scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSelectRoom = async (room) => {
        if (selectedRoom) {
            socket.emit('leave_chat', selectedRoom.id);
        }
        setSelectedRoom(room);
        socket.emit('join_chat', room.id);
        
        try {
            setLoadingMessages(true);
            const history = await getMessages(room.id);
            setMessages(history || []);
        } catch (error) {
            console.error('Failed to load message history:', error);
            toast.error('Could not load chat messages.');
        } finally {
            setLoadingMessages(false);
        }
    };

    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!inputText.trim() || !selectedRoom) return;

        try {
            const text = inputText;
            setInputText('');
            // REST call stores it in Postgres and broadcasts to Socket.IO room
            await sendMessage(selectedRoom.id, text);
        } catch (error) {
            console.error('Failed to send message:', error);
            toast.error('Failed to transmit message.');
        }
    };

    const handleCreateRoomSubmit = async (e) => {
        e.preventDefault();
        
        let payload = {
            type: newRoomType
        };

        if (newRoomType === 'group') {
            if (!newRoomName.trim()) {
                toast.error('Group name is required');
                return;
            }
            payload.name = newRoomName.trim();
        } else {
            if (!selectedMemberId) {
                toast.error('Please select a member to direct message');
                return;
            }
            payload.userIds = [parseInt(selectedMemberId, 10)];
        }

        try {
            const newRoom = await createRoom(payload);
            toast.success(newRoomType === 'group' ? 'Channel created!' : 'Conversation initialized!');
            setShowNewRoomModal(false);
            setNewRoomName('');
            setSelectedMemberId('');
            
            // Reload all rooms
            const updatedRooms = await getRooms();
            setRooms(updatedRooms);
            
            // Select the newly created/retrieved room
            const foundRoom = updatedRooms.find(r => r.id === newRoom.id);
            if (foundRoom) {
                handleSelectRoom(foundRoom);
            }
        } catch (error) {
            console.error('Failed to create room:', error);
            toast.error('Could not initialize chat room.');
        }
    };

    return (
        <div className="min-h-screen bg-[#060b13] text-slate-100 py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col">
            {/* Background glowing overlays */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-indigo-600/5 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col relative z-10">
                {/* Header */}
                <div className="pb-6 border-b border-white/10 mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
                            <MessageSquare className="w-8 h-8 text-blue-400" />
                            Enterprise Communication Hub
                        </h1>
                        <p className="text-slate-400 mt-1 font-medium font-sans">
                            Collaborate in real-time with Direct Messages, Group Channels, and Team Rooms.
                        </p>
                    </div>

                    <button
                        onClick={() => setShowNewRoomModal(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold hover:shadow-lg hover:shadow-blue-500/20 hover:scale-[1.02] transition cursor-pointer"
                    >
                        <Plus className="w-4 h-4 text-white" />
                        New Conversation
                    </button>
                </div>

                {/* Hub Workspace */}
                <div className="flex-1 min-h-[600px] grid grid-cols-1 lg:grid-cols-12 bg-white/[0.01] border border-white/5 rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl">
                    
                    {/* Left Sidebar - Chat channels / DMs */}
                    <div className="lg:col-span-4 border-r border-white/5 flex flex-col bg-white/[0.01]">
                        <div className="p-5 border-b border-white/5">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Users className="w-4 h-4 text-indigo-400" />
                                Chat Rooms & Channels
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-1">
                            {loadingRooms ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                                    <span className="text-xs">Fetching active conversations...</span>
                                </div>
                            ) : rooms.length === 0 ? (
                                <div className="text-center py-20 text-slate-500">
                                    <p className="text-xs font-semibold">No active chats in this workspace.</p>
                                    <p className="text-[10px] text-slate-600 mt-1">Start a new conversation to begin.</p>
                                </div>
                            ) : (
                                rooms.map(r => (
                                    <button
                                        key={r.id}
                                        onClick={() => handleSelectRoom(r)}
                                        className={`w-full text-left p-3.5 rounded-2xl transition flex flex-col gap-1 cursor-pointer ${
                                            selectedRoom?.id === r.id
                                                ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/10 border border-blue-500/30'
                                                : 'hover:bg-white/[0.02] border border-transparent'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-white flex items-center gap-2 truncate">
                                                {r.type === 'direct' ? <User className="w-3.5 h-3.5 text-blue-400" /> : <Hash className="w-3.5 h-3.5 text-indigo-400" />}
                                                {r.name}
                                            </span>
                                            {r.lastMessage && (
                                                <span className="text-[9px] text-slate-550 font-mono">
                                                    {new Date(r.lastMessage.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            )}
                                        </div>
                                        {r.lastMessage ? (
                                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                                <span className="font-semibold text-slate-300">{r.lastMessage.senderName}:</span> {r.lastMessage.content}
                                            </p>
                                        ) : (
                                            <p className="text-[10px] text-slate-600 italic">No messages yet</p>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Middle Column - Message Feed */}
                    <div className="lg:col-span-8 flex flex-col bg-white/[0.005]">
                        {selectedRoom ? (
                            <>
                                {/* Room Header */}
                                <div className="p-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2.5 bg-blue-500/10 rounded-xl text-blue-400">
                                            {selectedRoom.type === 'direct' ? <User className="w-5 h-5" /> : <Hash className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <h2 className="text-sm font-bold text-white leading-tight">{selectedRoom.name}</h2>
                                            <p className="text-[10px] text-slate-400 capitalize mt-0.5">
                                                {selectedRoom.type} room • {selectedRoom.members?.length || 0} members
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {selectedRoom.members?.map(m => (
                                            <div
                                                key={m.id}
                                                title={m.name}
                                                className="w-7 h-7 bg-white/5 rounded-full border border-white/10 flex items-center justify-center text-[10px] font-bold text-indigo-300 hover:scale-105 transition cursor-pointer overflow-hidden"
                                            >
                                                {m.avatarUrl ? (
                                                    <img src={m.avatarUrl.split('#')[0]} alt={m.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    m.name.charAt(0).toUpperCase()
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Message Stream */}
                                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                    {loadingMessages ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                            <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                                            <span className="text-xs">Loading message stream...</span>
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                                            <Sparkles className="w-10 h-10 text-slate-650 animate-pulse mb-3" />
                                            <p className="text-xs font-semibold">Start of conversation thread</p>
                                            <p className="text-[10px] text-slate-650 mt-1">Send a message to initialize the dialogue.</p>
                                        </div>
                                    ) : (
                                        messages.map(msg => {
                                            const isMe = msg.senderId === user.id;
                                            return (
                                                <div key={msg.id} className={`flex gap-3 max-w-lg ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                                                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center text-xs font-bold text-blue-300 overflow-hidden flex-shrink-0">
                                                        {msg.senderAvatar ? (
                                                            <img src={msg.senderAvatar.split('#')[0]} alt="Avatar" className="w-full h-full object-cover" />
                                                        ) : (
                                                            msg.senderName?.charAt(0).toUpperCase()
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col gap-1">
                                                        <div className={`flex items-baseline gap-2 ${isMe ? 'justify-end' : ''}`}>
                                                            <span className="text-[10px] font-black text-slate-300">{msg.senderName}</span>
                                                            <span className="text-[8px] text-slate-500 font-mono">
                                                                {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </span>
                                                        </div>

                                                        <div className={`p-3.5 rounded-2xl text-xs font-medium leading-relaxed shadow-lg ${
                                                            isMe
                                                                ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-none'
                                                                : 'bg-white/[0.04] border border-white/5 text-slate-200 rounded-tl-none'
                                                        }`}>
                                                            {msg.content}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                    <div ref={messagesEndRef} />
                                </div>

                                {/* Message Input */}
                                <form onSubmit={handleSendMessage} className="p-5 border-t border-white/5 bg-white/[0.01] flex items-center gap-3">
                                    <input
                                        type="text"
                                        placeholder={`Message ${selectedRoom.name}...`}
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        className="flex-1 bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3.5 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-200 placeholder-slate-500"
                                    />
                                    <button
                                        type="submit"
                                        disabled={!inputText.trim()}
                                        className="p-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg hover:shadow-blue-500/20"
                                    >
                                        <Send className="w-4 h-4" />
                                    </button>
                                </form>
                            </>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-500 p-8">
                                <MessageSquare className="w-12 h-12 text-slate-700 mb-3 animate-bounce" />
                                <h3 className="text-sm font-bold text-white">No Selected Conversation</h3>
                                <p className="text-xs text-slate-550 mt-1 max-w-xs text-center leading-normal">
                                    Select an active channel from the sidebar or launch a new conversation.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* NEW CONVERSATION MODAL */}
            {showNewRoomModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-[#0b1322] border border-white/10 w-full max-w-md rounded-3xl p-6 shadow-2xl relative">
                        <h2 className="text-lg font-extrabold text-white mb-5 flex items-center gap-2">
                            <Plus className="w-5 h-5 text-blue-400" />
                            Start New Conversation
                        </h2>

                        <form onSubmit={handleCreateRoomSubmit} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Room Type</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setNewRoomType('group')}
                                        className={`py-3.5 rounded-2xl text-xs font-bold border transition cursor-pointer ${
                                            newRoomType === 'group'
                                                ? 'bg-blue-600/10 text-blue-400 border-blue-500/30'
                                                : 'bg-white/[0.02] text-slate-400 border-white/5 hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        Group Channel
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setNewRoomType('direct')}
                                        className={`py-3.5 rounded-2xl text-xs font-bold border transition cursor-pointer ${
                                            newRoomType === 'direct'
                                                ? 'bg-blue-600/10 text-blue-400 border-blue-500/30'
                                                : 'bg-white/[0.02] text-slate-400 border-white/5 hover:bg-white/[0.04]'
                                        }`}
                                    >
                                        Direct Message
                                    </button>
                                </div>
                            </div>

                            {newRoomType === 'group' ? (
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Channel Name</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. general, marketing, project-omega"
                                        value={newRoomName}
                                        onChange={(e) => setNewRoomName(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3.5 text-xs font-semibold focus:outline-none focus:border-blue-500 text-slate-200"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Select User</label>
                                    <select
                                        value={selectedMemberId}
                                        onChange={(e) => setSelectedMemberId(e.target.value)}
                                        className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 py-3.5 text-xs font-bold focus:outline-none focus:border-blue-500 text-slate-300"
                                    >
                                        <option value="" className="bg-[#0b1322] text-slate-400">Choose a colleague...</option>
                                        {members.filter(m => m.id !== user.id).map(m => (
                                            <option key={m.id} value={m.id} className="bg-[#0b1322] text-slate-250">
                                                {m.name} ({m.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowNewRoomModal(false)}
                                    className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-xs font-bold rounded-2xl transition cursor-pointer text-slate-300"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold text-white rounded-2xl hover:shadow-lg hover:shadow-blue-500/20 hover:scale-[1.01] transition cursor-pointer"
                                >
                                    Initialize
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatHub;
