import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    CheckCircle2,
    ChevronDown,
    Eye,
    FileSpreadsheet,
    FileText,
    MessageSquare,
    Clock,
    Download,
    ShieldCheck,
    Check,
    X,
    Edit3,
    ImageIcon,
} from "lucide-react";
import { apiClient } from "@/api/api-client";
import { cn } from "@/lib/utils";

// =====================================================================
// Types based on the backend Models
// =====================================================================

interface Author {
    _id: string;
    name: string;
    username: string;
    avatar?: string;
    bio?: string;
}

interface PdfAttachment {
    url: string;
    publicId: string;
    originalName: string;
}

interface CsvAttachment {
    url: string;
}

interface CoverImage {
    url: string
}

interface Blog {
    _id: string;
    title: string;
    slug: string;
    content: string;
    excerpt: string;
    coverImage?: CoverImage;
    docType: string;
    category: string;
    status: "DRAFT" | "PENDING" | "APPROVED" | "PUBLISHED" | "REJECTED";
    tags: string[];
    createdAt: string;
    publishedAt?: string | null;
    author: Author;
    views: number;
    pdfs: PdfAttachment[];
    csv: CsvAttachment;
}

// =====================================================================
// Component
// =====================================================================

export default function ReviewWindow() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();

    // State
    const [blog, setBlog] = useState<Blog | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // Checklist State
    const [checklist, setChecklist] = useState({
        titleAndSlug: false,
        authorCredentials: false,
        attachments: false,
        formatting: false,
    });

    const [feedbackNotes, setFeedbackNotes] = useState("");

    const checkedCount = Object.values(checklist).filter(Boolean).length;
    const totalChecklist = Object.keys(checklist).length;
    const progressPercentage = totalChecklist === 0 ? 0 : (checkedCount / totalChecklist) * 100;

    // =====================================================================
    // API Calls
    // =====================================================================

    useEffect(() => {
        const fetchBlog = async () => {
            const fetchSlug = slug || "autonomous-edge-inference-sensor-processing";

            try {
                setIsLoading(true);
                const response = await apiClient.get<{ success: boolean; blog: Blog }>(`/blog/get/${fetchSlug}`);

                if (response.data.success) {
                    setBlog(response.data.blog);
                } else {
                    setError("Failed to fetch manuscript details.");
                }
            } catch (err: any) {
                setError(err.response?.data?.message || "An error occurred while fetching.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchBlog();
    }, [slug]);

    const handleUpdateStatus = async (newStatus: Blog["status"]) => {
        if (!blog) return;
        try {
            setIsUpdatingStatus(true);
            const response = await apiClient.put(`/blog/statusupdate/${blog._id}`, {
                status: newStatus,
            });

            if (response.data.success) {
                setBlog({ ...blog, status: newStatus });
            }
        } catch (err: any) {
            alert("Failed to update status: " + (err.response?.data?.message || err.message));
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    // =====================================================================
    // Loading & Error States
    // =====================================================================

    if (isLoading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-50">
                <div className="relative h-12 w-12">
                    <div className="absolute h-full w-full rounded-full border-4 border-slate-200"></div>
                    <div className="absolute h-full w-full animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
                </div>
            </div>
        );
    }

    if (error || !blog) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 mb-6">
                    <ShieldCheck className="h-10 w-10 text-slate-400" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900">Manuscript Not Found</h2>
                <p className="mt-2 max-w-sm text-slate-500">{error || "The requested document could not be loaded."}</p>
                <button
                    onClick={() => navigate(-1)}
                    className="mt-8 rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-sm transition-transform hover:scale-105 active:scale-95"
                >
                    Return to Queue
                </button>
            </div>
        );
    }

    // =====================================================================
    // Derived Data Rendering
    // =====================================================================

    const createdDate = new Date(blog.createdAt).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
    });

    const wordCount = blog.content ? blog.content.split(/\s+/).length : 0;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));
    const totalAttachments = (blog.pdfs?.length || 0) + (blog.csv?.url ? 1 : 0);

    return (
        <div className="min-h-screen w-full bg-slate-50/50 pb-24 font-sans text-slate-900 lg:pb-12 selection:bg-indigo-100 selection:text-indigo-900">
            {/* -----------------------------------------------------------------
                TOP NAVIGATION
            ------------------------------------------------------------------ */}
            <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200/80 bg-white/80 px-4 py-4 backdrop-blur-xl md:px-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="group flex items-center gap-2 text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900"
                    >
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 transition-transform group-hover:-translate-x-1">
                            <ArrowLeft className="h-4 w-4" />
                        </div>
                        <span className="hidden sm:inline">Back to Queue</span>
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="hidden flex-col items-end sm:flex">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                            Submission Date
                        </span>
                        <span className="text-xs font-semibold text-slate-600">{createdDate}</span>
                    </div>
                    <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
                    {blog.status === "PENDING" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-amber-700 ring-1 ring-inset ring-amber-600/20">
                            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
                            Pending Review
                        </span>
                    )}
                    {blog.status === "PUBLISHED" && (
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Published
                        </span>
                    )}
                </div>
            </header>

            {/* -----------------------------------------------------------------
                MAIN CONTENT GRID
            ------------------------------------------------------------------ */}
            <main className="mx-auto max-w-[1400px] p-4 md:p-6 lg:p-8">
                <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">

                    {/* ======================= LEFT COLUMN ======================= */}
                    <div className="space-y-8 xl:col-span-8">

                        {/* Header & Meta Card with Cover Image */}
                        <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm transition-all hover:shadow-md">
                            {/* Cover Image Section */}
                            {blog.coverImage ? (
                                <div className="group relative h-64 w-full overflow-hidden bg-slate-100 sm:h-80 md:h-[400px]">
                                    <img
                                        src={blog.coverImage?.url}
                                        alt={blog.title}
                                        className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/20 to-transparent opacity-80" />
                                </div>
                            ) : (
                                <div className="flex h-48 w-full items-center justify-center bg-slate-50 sm:h-64">
                                    <div className="flex flex-col items-center gap-2 text-slate-400">
                                        <ImageIcon className="h-12 w-12 opacity-50" />
                                        <span className="text-sm font-medium">No cover image provided</span>
                                    </div>
                                </div>
                            )}

                            <div className="p-6 sm:p-10">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className="rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
                                        {blog.docType || "RESEARCH"}
                                    </span>
                                    <span className="rounded-md bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 ring-1 ring-inset ring-indigo-600/10">
                                        {blog.category}
                                    </span>
                                    {blog.tags?.map((tag) => (
                                        <span key={tag} className="rounded-md bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-inset ring-slate-200">
                                            #{tag}
                                        </span>
                                    ))}
                                </div>

                                <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl md:leading-[1.1]">
                                    {blog.title}
                                </h1>

                                <p className="mt-6 border-l-4 border-indigo-500 pl-4 text-lg leading-relaxed text-slate-600">
                                    {blog.excerpt}
                                </p>

                                {/* Author Box */}
                                <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/50 p-5">
                                    <div className="flex items-center gap-4">
                                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border-2 border-white shadow-md sm:h-16 sm:w-16">
                                            <img
                                                src={blog.author.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(blog.author.name)}&background=random`}
                                                alt={blog.author.name}
                                                className="h-full w-full object-cover"
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <h3 className="text-base font-bold text-slate-900">
                                                    {blog.author.name}
                                                </h3>
                                                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                                            </div>
                                            <div className="mt-1 flex items-center gap-3 text-xs font-semibold text-slate-500 sm:text-sm">
                                                <span className="flex items-center gap-1.5">
                                                    <Clock className="h-4 w-4 text-slate-400" />
                                                    {readTime} min read
                                                </span>
                                                <span className="h-1 w-1 rounded-full bg-slate-300"></span>
                                                <span className="flex items-center gap-1.5">
                                                    <Eye className="h-4 w-4 text-slate-400" />
                                                    {blog.views.toLocaleString()} views
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="rounded-xl bg-white px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 transition-all hover:bg-slate-50 hover:shadow">
                                        View Profile
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Attachments Card */}
                        <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/30 p-6">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 shadow-inner">
                                        <FileText className="h-5 w-5 text-indigo-600" />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900">Attached Assets</h3>
                                </div>
                                <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-600 shadow-sm ring-1 ring-inset ring-slate-200">
                                    {totalAttachments} files
                                </span>
                            </div>

                            <div className="p-6 space-y-4">
                                {/* PDFs */}
                                {blog.pdfs?.map((pdf, idx) => (
                                    <div key={idx} className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-slate-200 hover:shadow-md">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 ring-1 ring-inset ring-red-100">
                                                <FileText className="h-6 w-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{pdf.originalName}</p>
                                                <p className="text-xs font-medium text-slate-500">PDF Document</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a href={pdf.url} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none justify-center rounded-xl bg-slate-50 px-5 py-2.5 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-100 text-center">
                                                Preview
                                            </a>
                                            <a href={pdf.url} download className="flex h-[38px] w-[38px] items-center justify-center rounded-xl bg-white text-slate-500 shadow-sm ring-1 ring-inset ring-slate-200 transition-colors hover:bg-slate-50 hover:text-slate-900">
                                                <Download className="h-4 w-4" />
                                            </a>
                                        </div>
                                    </div>
                                ))}

                                {/* CSV */}
                                {blog.csv?.url && (
                                    <div className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:border-slate-200 hover:shadow-md">
                                        <div className="flex items-center gap-4">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-100">
                                                <FileSpreadsheet className="h-6 w-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="truncate text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">dataset_telemetry.csv</p>
                                                <p className="text-xs font-medium text-slate-500">Raw Data / CSV</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <a href={blog.csv.url} target="_blank" rel="noreferrer" className="flex-1 sm:flex-none justify-center rounded-xl bg-indigo-50 px-5 py-2.5 text-xs font-bold text-indigo-700 ring-1 ring-inset ring-indigo-600/10 transition-colors hover:bg-indigo-100 text-center">
                                                Inspect Dataset
                                            </a>
                                        </div>
                                    </div>
                                )}

                                {totalAttachments === 0 && (
                                    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-10">
                                        <FileText className="mb-2 h-8 w-8 text-slate-300" />
                                        <p className="text-sm font-medium text-slate-500">No external assets attached.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Manuscript Content Preview */}
                        <div className="overflow-hidden rounded-3xl border border-slate-200/60 bg-white shadow-sm">
                            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/30 px-8 py-5">
                                <h3 className="text-xs font-bold uppercase tracking-widest text-slate-500">Manuscript Content</h3>
                            </div>
                            <div className="p-8">
                                <div
                                    className="prose prose-slate max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-h2:text-2xl prose-p:text-slate-600 prose-p:leading-relaxed prose-a:font-semibold prose-a:text-indigo-600 hover:prose-a:text-indigo-500 prose-img:rounded-2xl prose-img:shadow-sm"
                                    dangerouslySetInnerHTML={{ __html: blog.content }}
                                />
                                <div className="mt-10 flex justify-center border-t border-slate-100 pt-8">
                                    <button className="flex items-center gap-2 rounded-full bg-slate-50 px-6 py-2.5 text-sm font-bold text-indigo-600 shadow-sm ring-1 ring-inset ring-slate-200 transition-all hover:bg-indigo-50 hover:ring-indigo-200">
                                        Read full draft ({wordCount.toLocaleString()} words)
                                        <ChevronDown className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* ======================= RIGHT COLUMN ======================= */}
                    <div className="space-y-6 xl:col-span-4">

                        {/* Checklist */}
                        <div className="rounded-3xl border border-slate-200/60 bg-white shadow-sm">
                            <div className="border-b border-slate-100 p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <ShieldCheck className="h-6 w-6 text-indigo-600" />
                                        <h3 className="text-lg font-bold text-slate-900">Editorial Checklist</h3>
                                    </div>
                                    <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
                                        {checkedCount}/{totalChecklist}
                                    </span>
                                </div>
                                {/* Progress Bar */}
                                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                                    <div
                                        className="h-full bg-indigo-500 transition-all duration-500 ease-out"
                                        style={{ width: `${progressPercentage}%` }}
                                    />
                                </div>
                            </div>

                            <div className="p-4 space-y-2">
                                <ChecklistItem
                                    checked={checklist.titleAndSlug}
                                    onChange={() => setChecklist(p => ({ ...p, titleAndSlug: !p.titleAndSlug }))}
                                    label="Title and slug format verified"
                                />
                                <ChecklistItem
                                    checked={checklist.authorCredentials}
                                    onChange={() => setChecklist(p => ({ ...p, authorCredentials: !p.authorCredentials }))}
                                    label="Author credentials & identity confirmed"
                                />
                                <ChecklistItem
                                    checked={checklist.attachments}
                                    onChange={() => setChecklist(p => ({ ...p, attachments: !p.attachments }))}
                                    label={`Assets validated (${blog.pdfs?.length || 0} PDFs, ${blog.csv?.url ? 1 : 0} CSV)`}
                                />
                                <ChecklistItem
                                    checked={checklist.formatting}
                                    onChange={() => setChecklist(p => ({ ...p, formatting: !p.formatting }))}
                                    label="Content formatting & tags categorized correctly"
                                />
                            </div>
                        </div>

                        {/* Metadata Settings */}
                        <div className="rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm">
                            <h3 className="mb-6 text-lg font-bold text-slate-900">Metadata Details</h3>

                            <div className="space-y-5">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Category</label>
                                    <div className="mt-1.5 w-full rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200/60">
                                        {blog.category}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">URL Slug</label>
                                    <div className="mt-1.5 w-full truncate rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200/60">
                                        {blog.slug}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Document Type</label>
                                    <div className="mt-1.5 w-full rounded-xl bg-slate-50 p-3 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200/60">
                                        {blog.docType}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Decision & Feedback (Sticky) */}
                        <div className="sticky top-28 rounded-3xl border border-slate-200/60 bg-white p-6 shadow-sm">
                            <div className="mb-2 flex items-center gap-3">
                                <MessageSquare className="h-5 w-5 text-slate-400" />
                                <h3 className="text-lg font-bold text-slate-900">Decision & Feedback</h3>
                            </div>
                            <p className="mb-5 text-xs font-medium text-slate-500">Leave revision notes or guidance (Visible to Author)</p>

                            <div className="relative">
                                <textarea
                                    rows={4}
                                    value={feedbackNotes}
                                    onChange={(e) => setFeedbackNotes(e.target.value)}
                                    placeholder={`Add specific guidance or praise for ${blog.author.name}...`}
                                    className="w-full resize-none rounded-2xl border-0 bg-slate-50 p-4 text-sm font-medium text-slate-900 shadow-inner ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-600 transition-all"
                                />
                            </div>
                            <div className="mt-3 flex justify-between px-1 text-[11px] font-semibold text-slate-400">
                                <span>Markdown supported</span>
                                <span>{feedbackNotes.length} / 1200</span>
                            </div>

                            {/* Action Buttons */}
                            <div className="mt-8 flex flex-col gap-3">
                                <button
                                    onClick={() => handleUpdateStatus("PUBLISHED")}
                                    disabled={isUpdatingStatus || checkedCount < totalChecklist}
                                    className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-4 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 hover:shadow-lg disabled:opacity-50 disabled:hover:bg-indigo-600 disabled:hover:shadow-md"
                                >
                                    <Check className="h-5 w-5 transition-transform group-hover:scale-110" />
                                    Approve & Publish
                                </button>

                                {checkedCount < totalChecklist && (
                                    <p className="text-center text-[10px] font-semibold text-amber-600 mt-1 mb-2">
                                        Complete checklist to publish
                                    </p>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => handleUpdateStatus("PENDING")}
                                        disabled={isUpdatingStatus}
                                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-50 px-4 py-3.5 text-sm font-bold text-slate-700 ring-1 ring-inset ring-slate-200 transition-all hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
                                    >
                                        <Edit3 className="h-4 w-4" />
                                        Request Revision
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus("REJECTED")}
                                        disabled={isUpdatingStatus}
                                        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-50 px-4 py-3.5 text-sm font-bold text-red-600 ring-1 ring-inset ring-red-100 transition-all hover:bg-red-100 hover:text-red-700 disabled:opacity-50"
                                    >
                                        <X className="h-4 w-4" />
                                        Reject
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}

// =====================================================================
// Small Helper Components
// =====================================================================

function ChecklistItem({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
    return (
        <label className="group flex cursor-pointer items-start gap-3 rounded-xl p-3 transition-colors hover:bg-slate-50">
            <div className="relative flex items-center justify-center pt-0.5">
                <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={checked}
                    onChange={onChange}
                />
                <div className="h-5 w-5 rounded-md bg-white border-2 border-slate-200 peer-checked:bg-indigo-600 peer-checked:border-indigo-600 transition-all group-hover:border-indigo-400"></div>
                <Check className="absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100 transition-opacity" strokeWidth={3} />
            </div>
            <span className={cn("text-sm transition-colors", checked ? "text-slate-900 font-bold" : "text-slate-600 font-medium")}>
                {label}
            </span>
        </label>
    );
}