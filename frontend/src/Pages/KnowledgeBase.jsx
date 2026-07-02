import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getPages, createPage, updatePage, deletePage } from '../Services/kbApi';
import { BookOpen, FileText, ClipboardList, PenTool, Plus, Edit2, Trash2, Loader2, Calendar } from 'lucide-react';
import toast from 'react-hot-toast';

const KnowledgeBase = () => {
    const { user } = useAuth();
    const [pages, setPages] = useState([]);
    const [activeTab, setActiveTab] = useState('wiki'); // wiki, doc, note, sop
    const [selectedPage, setSelectedPage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);

    // Form inputs
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);

    const loadPages = async (type) => {
        try {
            setLoading(true);
            const data = await getPages(type);
            setPages(data || []);
            
            // Auto select first page if available
            if (data && data.length > 0) {
                setSelectedPage(data[0]);
                setTitle(data[0].title);
                setContent(data[0].content);
            } else {
                setSelectedPage(null);
                setTitle('');
                setContent('');
            }
        } catch (error) {
            console.error('Failed to load KB pages:', error);
            toast.error('Failed to retrieve knowledge base records.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPages(activeTab);
        setEditMode(false);
        setIsCreating(false);
    }, [activeTab, user?.activeWorkspaceId]);

    const handleSelectPage = (page) => {
        setSelectedPage(page);
        setTitle(page.title);
        setContent(page.content);
        setEditMode(false);
        setIsCreating(false);
    };

    const handleNewPageClick = () => {
        setIsCreating(true);
        setEditMode(true);
        setSelectedPage(null);
        setTitle('');
        setContent('');
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!title.trim()) {
            toast.error('Title is required');
            return;
        }

        setIsSaving(true);
        try {
            if (isCreating) {
                await createPage({
                    title: title.trim(),
                    content: content,
                    type: activeTab
                });
                toast.success('Document created successfully! 📄');
                setIsCreating(false);
                setEditMode(false);
                loadPages(activeTab);
            } else if (selectedPage) {
                const updated = await updatePage(selectedPage.id, {
                    title: title.trim(),
                    content: content
                });
                toast.success('Document updated successfully! 💾');
                setEditMode(false);
                // Reload specific page
                setPages(prev => prev.map(p => p.id === updated.id ? { ...p, title: updated.title, content: updated.content } : p));
                setSelectedPage(updated);
            }
        } catch (error) {
            console.error('Failed to save document:', error);
            toast.error(error?.response?.data?.message || (isCreating ? 'Failed to create document' : 'Failed to update document'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (pageId) => {
        if (!window.confirm('Are you sure you want to permanently delete this document?')) return;

        setDeletingId(pageId);
        try {
            await deletePage(pageId);
            toast.success('Document deleted.');
            loadPages(activeTab);
        } catch (error) {
            console.error('Failed to delete page:', error);
            toast.error(error?.response?.data?.message || 'Failed to delete document');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="min-h-screen text-ink py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden flex flex-col">
            {/* Background glowing overlays */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-indigo-600/5 rounded-full blur-[120px]" />
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[100px]" />
            </div>

            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col relative z-10">
                {/* Header */}
                <div className="pb-6 border-b border-line mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold tracking-tight text-ink flex items-center gap-3">
                            <BookOpen className="w-8 h-8 text-indigo-400" />
                            Workspace Knowledge Base
                        </h1>
                        <p className="text-ink-soft mt-1 font-medium font-sans">
                            Central wiki documentation, SOP compliance checklists, shared notes, and resource guides.
                        </p>
                    </div>

                    <button
                        onClick={handleNewPageClick}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold hover:shadow-lg hover:shadow-blue-500/20 hover:scale-[1.02] transition cursor-pointer"
                    >
                        <Plus className="w-4 h-4 text-ink" />
                        Create Document
                    </button>
                </div>

                {/* Sub Tab selection */}
                <div className="flex gap-2 bg-surface-2 border border-line p-1.5 rounded-2xl mb-8 w-fit">
                    {[
                        { id: 'wiki', name: 'Wiki Pages', icon: BookOpen },
                        { id: 'doc', name: 'Documentation', icon: FileText },
                        { id: 'note', name: 'Workspace Notes', icon: PenTool },
                        { id: 'sop', name: 'SOP Library', icon: ClipboardList }
                    ].map(t => {
                        const Icon = t.icon;
                        return (
                            <button
                                key={t.id}
                                onClick={() => setActiveTab(t.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition duration-200 cursor-pointer ${
                                    activeTab === t.id
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg border border-blue-500/30'
                                        : 'text-ink-soft hover:text-ink hover:bg-surface-2'
                                }`}
                            >
                                <Icon className="w-4 h-4" />
                                {t.name}
                            </button>
                        );
                    })}
                </div>

                {/* Main Workspace Layout */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 bg-surface-2 border border-line rounded-3xl overflow-hidden backdrop-blur-md shadow-2xl">
                    
                    {/* Left Sidebar - Documents directory */}
                    <div className="lg:col-span-4 border-r border-line flex flex-col bg-surface-2">
                        <div className="p-5 border-b border-line">
                            <h3 className="text-xs font-black text-ink-soft uppercase tracking-widest block">
                                Document Directory
                            </h3>
                        </div>

                        <div className="flex-1 overflow-y-auto p-3 space-y-1">
                            {loading ? (
                                <div className="flex flex-col items-center justify-center py-20 text-ink-soft">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                                    <span className="text-xs">Scanning directory...</span>
                                </div>
                            ) : pages.length === 0 ? (
                                <div className="text-center py-20 text-ink-soft">
                                    <p className="text-xs font-semibold">No records found.</p>
                                    <p className="text-[10px] text-ink-faint mt-1">Create a new document to populate this tab.</p>
                                </div>
                            ) : (
                                pages.map(p => (
                                    <div
                                        key={p.id}
                                        className={`w-full text-left p-3.5 rounded-2xl transition flex items-center justify-between group ${
                                            selectedPage?.id === p.id
                                                ? 'bg-gradient-to-r from-blue-600/20 to-indigo-600/10 border border-blue-500/30'
                                                : 'hover:bg-surface-2 border border-transparent'
                                        }`}
                                    >
                                        <button
                                            onClick={() => handleSelectPage(p)}
                                            className="flex-1 text-left text-xs font-bold text-ink pr-2 truncate cursor-pointer"
                                        >
                                            {p.title}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(p.id)}
                                            disabled={deletingId === p.id}
                                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition cursor-pointer disabled:opacity-50"
                                        >
                                            {deletingId === p.id ? (
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-3.5 h-3.5" />
                                            )}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Column - Editor / Viewer */}
                    <div className="lg:col-span-8 flex flex-col p-6 bg-surface-2">
                        {editMode ? (
                            <form onSubmit={handleSave} className="flex-1 flex flex-col gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Document Title</label>
                                    <input
                                        type="text"
                                        placeholder="Enter title..."
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        className="w-full bg-surface-2 border border-line rounded-2xl px-5 py-3.5 text-xs font-semibold focus:outline-none focus:border-indigo-500 text-ink"
                                    />
                                </div>

                                <div className="flex-1 flex flex-col space-y-1.5 min-h-[300px]">
                                    <label className="text-[10px] font-black text-ink-soft uppercase tracking-widest block">Content (Plain text / Markdown support)</label>
                                    <textarea
                                        placeholder="Draft document content here..."
                                        value={content}
                                        onChange={(e) => setContent(e.target.value)}
                                        className="w-full flex-1 bg-surface-2 border border-line rounded-2xl p-5 text-xs font-medium focus:outline-none focus:border-indigo-500 text-ink font-mono leading-relaxed resize-none"
                                    />
                                </div>

                                <div className="flex gap-3 justify-end mt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditMode(false);
                                            setIsCreating(false);
                                            if (selectedPage) {
                                                setTitle(selectedPage.title);
                                                setContent(selectedPage.content);
                                            }
                                        }}
                                        className="px-5 py-2.5 bg-surface-2 hover:bg-surface-2 text-xs font-bold rounded-xl transition cursor-pointer text-ink"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-xs font-bold text-white rounded-xl hover:shadow-lg hover:shadow-blue-500/20 hover:scale-[1.01] transition cursor-pointer disabled:opacity-50"
                                    >
                                        {isSaving ? (
                                            <span className="flex items-center gap-1.5">
                                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                Saving...
                                            </span>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </button>
                                </div>
                            </form>
                        ) : selectedPage ? (
                            <div className="flex-1 flex flex-col gap-6">
                                <div className="border-b border-line pb-4 flex justify-between items-start gap-4">
                                    <div>
                                        <h2 className="text-xl font-bold text-ink">{selectedPage.title}</h2>
                                        <div className="flex items-center gap-4 text-[10px] text-ink-soft mt-2 font-mono">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3.5 h-3.5" />
                                                Updated {new Date(selectedPage.updatedAt).toLocaleDateString()}
                                            </span>
                                            <span>Author: {selectedPage.creatorName || 'System'}</span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => setEditMode(true)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-500/20 transition text-[10px] font-bold cursor-pointer"
                                    >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        Edit Page
                                    </button>
                                </div>

                                <div className="flex-1 text-ink text-xs leading-relaxed font-sans whitespace-pre-wrap font-medium">
                                    {selectedPage.content || <span className="italic text-ink-soft">Empty document. Click Edit Page to add context.</span>}
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-ink-soft p-8">
                                <BookOpen className="w-12 h-12 text-ink-faint mb-3 animate-bounce" />
                                <h3 className="text-sm font-bold text-ink">No Selected Document</h3>
                                <p className="text-xs text-ink-soft mt-1 max-w-xs text-center leading-normal">
                                    Choose a document from the directory catalog directory or create one.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KnowledgeBase;
