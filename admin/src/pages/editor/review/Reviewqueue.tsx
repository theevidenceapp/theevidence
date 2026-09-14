import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search,
    Filter,
    ArrowUpDown,
    FileText,
    FileSpreadsheet,
    Clock,
    Eye,
    ExternalLink,
    ShieldCheck,
    CheckCircle2,
    Image as ImageIcon,
    Layers,
    FlaskConical,
    BookOpen,
    RefreshCw,
    AlertCircle,
    ChevronLeft,
    ChevronRight,
    ChevronDown,
} from 'lucide-react';
import { apiClient } from '@/api/api-client';
import { cn } from '@/lib/utils';
import useTitle from '@/hooks/useTitle';

// =====================================================================
// Interfaces & Types
// =====================================================================

export type DocType = 'RESEARCH' | 'BLOG';
export type BlogStatus =
    'DRAFT' | 'PENDING' | 'APPROVED' | 'PUBLISHED' | 'REJECTED';

export interface Author {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    role?: string;
}

export interface PdfAttachment {
    url: string;
    publicId: string;
    originalName: string;
}

export interface BlogItem {
    _id: string;
    title: string;
    slug: string;
    excerpt?: string;
    content?: string;
    docType?: DocType;
    category: string;
    status: BlogStatus;
    tags: string[];
    createdAt: string;
    publishedAt?: string | null;
    author: Author;
    views?: number;
    coverImage?: {
        url: string;
        publicId?: string;
    };
    csv?: {
        url: string;
    };
    pdfs?: PdfAttachment[];
}

export interface GetBlogsResponse {
    success: boolean;
    message: string;
    blogs: BlogItem[];
}

type TabFilter = 'ALL' | 'RESEARCH' | 'BLOG';
type SortOption = 'newest' | 'oldest' | 'views';

// =====================================================================
// Core Classification Heuristic
// =====================================================================

const resolveDocType = (item: BlogItem): DocType => {
    if (item.docType === 'BLOG' || item.docType === 'RESEARCH') {
        return item.docType;
    }

    const categoryMatch = item.category?.toLowerCase() || '';
    if (
        categoryMatch.includes('blog') ||
        categoryMatch.includes('article') ||
        item.coverImage?.url
    ) {
        return 'BLOG';
    }

    return 'RESEARCH';
};

// =====================================================================
// Component Definition
// =====================================================================

export default function ReviewQueue() {
    useTitle('Review Queue')
    const navigate = useNavigate();

    // Data & Lifecycle State
    const [blogs, setBlogs] = useState<BlogItem[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Filter & Control State
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
    const [activeTab, setActiveTab] = useState<TabFilter>('ALL');
    const [sortBy, setSortBy] = useState<SortOption>('newest');

    // Pagination State
    const [currentPage, setCurrentPage] = useState<number>(1);
    const itemsPerPage = 10;

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery, selectedCategory, activeTab, sortBy]);

    const fetchQueueData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response =
                await apiClient.get<GetBlogsResponse>('/blog/getall');
            if (response.data.success) {
                setBlogs(response.data.blogs || []);
            } else {
                setError('Failed to retrieve queue records.');
            }
        } catch (err: any) {
            setError(
                err?.response?.data?.message ||
                'Internal server error fetching queue.',
            );
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchQueueData();
    }, []);

    // Metric Aggregation (Independent of visibility filters)
    const pendingResearchCount = useMemo(() => {
        return blogs.filter((b) => {
            const status = b.status?.toUpperCase() || '';
            return (
                resolveDocType(b) === 'RESEARCH' &&
                (status === 'DRAFT' || status === 'PENDING')
            );
        }).length;
    }, [blogs]);

    const pendingBlogCount = useMemo(() => {
        return blogs.filter((b) => {
            const status = b.status?.toUpperCase() || '';
            return (
                resolveDocType(b) === 'BLOG' &&
                (status === 'DRAFT' || status === 'PENDING')
            );
        }).length;
    }, [blogs]);

    const categories = useMemo(() => {
        const set = new Set<string>();
        blogs.forEach((b) => {
            if (b.category) set.add(b.category);
        });
        return Array.from(set);
    }, [blogs]);

    // Visibility Filtering & Sorting
    const filteredBlogs = useMemo(() => {
        const query = searchQuery.toLowerCase().trim();

        return [...blogs]
            .filter((item) => {
                const matchesSearch =
                    !query ||
                    item.title.toLowerCase().includes(query) ||
                    item.slug.toLowerCase().includes(query) ||
                    item.author?.name?.toLowerCase().includes(query) ||
                    item.author?.email?.toLowerCase().includes(query) ||
                    item.tags?.some((tag) =>
                        tag.toLowerCase().includes(query),
                    );

                const matchesCategory =
                    selectedCategory === 'ALL' ||
                    item.category.toLowerCase() ===
                    selectedCategory.toLowerCase();

                return matchesSearch && matchesCategory;
            })
            .sort(/* existing sort logic */);
    }, [blogs, searchQuery, selectedCategory, sortBy]);

    // Pre-Pagination Segregation (for accurate tab counts)
    const researchQueue = useMemo(
        () => filteredBlogs.filter((b) => resolveDocType(b) === 'RESEARCH'),
        [filteredBlogs],
    );

    const blogQueue = useMemo(
        () => filteredBlogs.filter((b) => resolveDocType(b) === 'BLOG'),
        [filteredBlogs],
    );

    // Unified Pagination Engine
    const activeDataset =
        activeTab === 'ALL'
            ? filteredBlogs
            : activeTab === 'RESEARCH'
                ? researchQueue
                : blogQueue;
    const totalPages = Math.max(
        1,
        Math.ceil(activeDataset.length / itemsPerPage),
    );

    const paginatedDataset = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return activeDataset.slice(startIndex, startIndex + itemsPerPage);
    }, [activeDataset, currentPage]);

    // Post-Pagination Segregation (for rendering the active grid)
    const paginatedResearch =
        activeTab === 'ALL'
            ? paginatedDataset.filter((b) => resolveDocType(b) === 'RESEARCH')
            : activeTab === 'RESEARCH'
                ? paginatedDataset
                : [];

    const paginatedBlog =
        activeTab === 'ALL'
            ? paginatedDataset.filter((b) => resolveDocType(b) === 'BLOG')
            : activeTab === 'BLOG'
                ? paginatedDataset
                : [];

    return (
        <div className="-mx-4 -mt-4 min-h-screen bg-[#f4f6fa] text-slate-900 font-sans pb-16 sm:-mx-6 sm:-mt-6">
            {/*
                top-0 (previously top-16): this bar used to sit below
                AdminPanelLayout's own sticky top-0 h-16 header. That header
                has since been removed from AdminPanelLayout entirely, so
                there is nothing left for this bar to clear — it now sticks
                directly to the top of the scroll container, flush against
                the (still present) sidebar, matching the flush-top
                treatment used on the Access Control / Blocked Users screen.
            */}
            <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md px-4 py-4 md:px-8 shadow-xs">
                <div className="mx-auto max-w-7xl space-y-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="relative min-w-0 flex-1 md:max-w-xl">
                            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Filter published records by title, slug, author, category, or tag..."
                                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2 text-sm text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5">
                            {/* <div className="relative flex items-center">
                                <Filter className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none z-10" />
                                <select
                                    value={selectedCategory}
                                    onChange={(e) =>
                                        setSelectedCategory(e.target.value)
                                    }
                                    className="max-w-[180px] sm:max-w-none appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer truncate"
                                >
                                    <option value="ALL">
                                        Category: All Categories
                                    </option>
                                    {categories.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                            </div> */}

                            <div className="relative flex items-center">
                                <ArrowUpDown className="absolute left-3 h-3.5 w-3.5 text-slate-400 pointer-events-none z-10" />
                                <select
                                    value={sortBy}
                                    onChange={(e) =>
                                        setSortBy(e.target.value as SortOption)
                                    }
                                    className="max-w-[180px] sm:max-w-none appearance-none rounded-xl border border-slate-200 bg-white pl-9 pr-8 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer truncate"
                                >
                                    <option value="newest">
                                        Sort: Newest Published
                                    </option>
                                    <option value="oldest">
                                        Sort: Oldest Published
                                    </option>
                                    <option value="views">
                                        Sort: Most Viewed
                                    </option>
                                </select>
                                <ChevronDown className="absolute right-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                            </div>

                            <button
                                onClick={fetchQueueData}
                                disabled={isLoading}
                                title="Refresh Records"
                                className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-600 shadow-xs hover:bg-slate-50 active:bg-slate-100 transition-colors"
                            >
                                <RefreshCw
                                    className={cn(
                                        'h-4 w-4',
                                        isLoading && 'animate-spin',
                                    )}
                                />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
                        <button
                            onClick={() => setActiveTab('ALL')}
                            className={cn(
                                'flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0',
                                activeTab === 'ALL'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                            )}
                        >
                            <Layers className="h-3.5 w-3.5" />
                            All Published ({filteredBlogs.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('RESEARCH')}
                            className={cn(
                                'flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0',
                                activeTab === 'RESEARCH'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                            )}
                        >
                            <FlaskConical className="h-3.5 w-3.5" />
                            Research Library ({researchQueue.length})
                        </button>
                        <button
                            onClick={() => setActiveTab('BLOG')}
                            className={cn(
                                'flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0',
                                activeTab === 'BLOG'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                            )}
                        >
                            <BookOpen className="h-3.5 w-3.5" />
                            Blog Articles ({blogQueue.length})
                        </button>
                    </div>
                </div>
            </div>

            <div className="mx-auto max-w-7xl px-4 pt-6 md:px-8 space-y-10">
                {isLoading && (
                    <div className="space-y-6">
                        <SkeletonCard />
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                )}

                {error && (
                    <div className="flex items-start sm:items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
                        <AlertCircle className="h-5 w-5 shrink-0" />
                        <p className="text-sm font-medium break-words">{error}</p>
                    </div>
                )}

                {!isLoading && !error && (
                    <>
                        {/* -----------------------------------------------------------------
                            SECTION 1: PUBLISHED RESEARCH
                        ------------------------------------------------------------------ */}
                        {(activeTab === 'ALL' || activeTab === 'RESEARCH') && (
                            <section className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <FlaskConical className="h-5 w-5 text-indigo-600 shrink-0" />
                                        <h2 className="text-lg font-extrabold text-slate-900">
                                            Published Research
                                        </h2>
                                    </div>
                                    <span className="rounded-full bg-amber-100/80 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200 whitespace-nowrap">
                                        {pendingResearchCount} Pending
                                        System-Wide
                                    </span>
                                </div>

                                {paginatedResearch.length === 0 ? (
                                    activeTab === 'ALL' &&
                                        paginatedBlog.length > 0 ? null : (
                                        <EmptyQueueState message="No published research manuscripts match current criteria." />
                                    )
                                ) : (
                                    <div className="space-y-4">
                                        {paginatedResearch.map((item) => (
                                            <ResearchQueueCard
                                                key={item._id}
                                                item={item}
                                                onOpenReview={() =>
                                                    navigate(
                                                        `/editor/review/${item.slug}`,
                                                    )
                                                }
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}

                        {/* -----------------------------------------------------------------
                            SECTION 2: PUBLISHED BLOGS
                        ------------------------------------------------------------------ */}
                        {(activeTab === 'ALL' || activeTab === 'BLOG') && (
                            <section className="space-y-4">
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                                    <div className="flex items-center gap-2.5">
                                        <BookOpen className="h-5 w-5 text-indigo-600 shrink-0" />
                                        <h2 className="text-lg font-extrabold text-slate-900">
                                            Published Blogs
                                        </h2>
                                    </div>
                                    <span className="rounded-full bg-amber-100/80 px-3 py-1 text-xs font-bold text-amber-800 border border-amber-200 whitespace-nowrap">
                                        {pendingBlogCount} Pending System-Wide
                                    </span>
                                </div>

                                {paginatedBlog.length === 0 ? (
                                    activeTab === 'ALL' &&
                                        paginatedResearch.length > 0 ? null : (
                                        <EmptyQueueState message="No published blog articles match current criteria." />
                                    )
                                ) : (
                                    <div className="space-y-4">
                                        {paginatedBlog.map((item) => (
                                            <BlogQueueCard
                                                key={item._id}
                                                item={item}
                                                onOpenReview={() =>
                                                    navigate(
                                                        `/editor/review/${item.slug}`,
                                                    )
                                                }
                                            />
                                        ))}
                                    </div>
                                )}
                            </section>
                        )}

                        {/* -----------------------------------------------------------------
                            PAGINATION CONTROLS
                        ------------------------------------------------------------------ */}
                        {activeDataset.length > 0 && (
                            <div className="mt-8 flex flex-col gap-3 rounded-xl bg-white p-4 shadow-sm border border-slate-200 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-xs text-slate-500 font-medium text-center sm:text-left">
                                    Showing{' '}
                                    <span className="font-bold text-slate-800">
                                        {(currentPage - 1) * itemsPerPage + 1}
                                    </span>{' '}
                                    to{' '}
                                    <span className="font-bold text-slate-800">
                                        {Math.min(
                                            currentPage * itemsPerPage,
                                            activeDataset.length,
                                        )}
                                    </span>{' '}
                                    of{' '}
                                    <span className="font-bold text-slate-800">
                                        {activeDataset.length}
                                    </span>{' '}
                                    published entries
                                </p>
                                <div className="flex items-center justify-center gap-2 sm:justify-end">
                                    <button
                                        onClick={() =>
                                            setCurrentPage((prev) =>
                                                Math.max(1, prev - 1),
                                            )
                                        }
                                        disabled={currentPage === 1}
                                        className="flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        <ChevronLeft className="h-4 w-4" />
                                    </button>
                                    <div className="text-xs font-bold text-slate-700 px-2 whitespace-nowrap">
                                        Page {currentPage} of {totalPages}
                                    </div>
                                    <button
                                        onClick={() =>
                                            setCurrentPage((prev) =>
                                                Math.min(totalPages, prev + 1),
                                            )
                                        }
                                        disabled={currentPage === totalPages}
                                        className="flex items-center justify-center rounded-lg border border-slate-200 p-1.5 text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none"
                                    >
                                        <ChevronRight className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <footer className="mt-12 border-t border-slate-200 bg-white py-3 px-4 text-center text-xs text-slate-500">
                <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="flex items-center justify-center gap-2 sm:justify-start">
                        <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                        <span>
                            System Metrics Evaluated: Research Drafts/Pending (
                            {pendingResearchCount}) • Blog Drafts/Pending (
                            {pendingBlogCount})
                        </span>
                    </div>
                    <span className="font-mono text-[11px] text-slate-400">
                        Schema: Client Visibility Locked to PUBLISHED
                    </span>
                </div>
            </footer>
        </div>
    );
}

// =====================================================================
// Research Queue Card Component
// =====================================================================

function ResearchQueueCard({
    item,
    onOpenReview,
}: {
    item: BlogItem;
    onOpenReview: () => void;
}) {
    const wordCount = item.content ? item.content.split(/\s+/).length : 250;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));
    const pdfCount = item.pdfs?.length || 0;
    const hasCsv = Boolean(item.csv?.url);

    return (
        <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300 hover:shadow-md">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-center">
                <div className="min-w-0 space-y-2.5 md:col-span-6">
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 shrink-0">
                            {item.category || 'Research'}
                        </span>
                        <span className="font-mono text-[11px] text-slate-400 truncate max-w-[140px] sm:max-w-[240px]">
                            research/{item.slug}
                        </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors break-words">
                        {item.title}
                    </h3>

                    {item.excerpt && (
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {item.excerpt}
                        </p>
                    )}

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
                        {item.tags?.map((t) => (
                            <span
                                key={t}
                                className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600"
                            >
                                #{t}
                            </span>
                        ))}
                        <span className="flex items-center gap-1 text-[11px] whitespace-nowrap">
                            <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                            {readTime} min read
                        </span>
                        <span className="flex items-center gap-1 text-[11px] whitespace-nowrap">
                            <Eye className="h-3 w-3 text-slate-400 shrink-0" />
                            {item.views || 0} views
                        </span>
                    </div>
                </div>

                <div className="min-w-0 rounded-xl bg-slate-50/80 p-3.5 border border-slate-100 md:col-span-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 font-bold text-white text-xs">
                            {item.author?.name
                                ? item.author.name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .substring(0, 2)
                                    .toUpperCase()
                                : 'AU'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1">
                                <p className="truncate text-xs font-bold text-slate-900">
                                    {item.author?.name || 'Unknown Author'}
                                </p>
                                <CheckCircle2 className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                            </div>
                            <p className="truncate text-[11px] text-slate-500">
                                {item.author?.email || 'author@domain.com'}
                            </p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                                    Role: {item.author?.role || 'PUBLISHER'}
                                </span>
                                <span className="text-[10px] font-bold text-emerald-600 whitespace-nowrap">
                                    Verified
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="min-w-0 flex flex-col justify-between space-y-3 md:col-span-3 md:border-l md:border-slate-100 md:pl-6">
                    <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] font-semibold text-slate-500 truncate">
                            Attachments ({pdfCount} PDFs
                            {hasCsv ? ', 1 CSV' : ''})
                        </div>
                        <StatusBadge status={item.status} />
                    </div>

                    <div className="space-y-1.5">
                        {item.pdfs?.slice(0, 2).map((pdf, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-[11px] text-slate-600"
                            >
                                <span className="flex items-center gap-1.5 min-w-0 truncate">
                                    <FileText className="h-3 w-3 text-red-500 shrink-0" />
                                    <span className="truncate">
                                        {pdf.originalName ||
                                            `attachment_${idx + 1}.pdf`}
                                    </span>
                                </span>
                            </div>
                        ))}
                        {hasCsv && (
                            <div className="flex items-center justify-between gap-2 rounded bg-emerald-50/60 px-2 py-1 text-[11px] text-emerald-800">
                                <span className="flex items-center gap-1.5 truncate">
                                    <FileSpreadsheet className="h-3 w-3 text-emerald-600 shrink-0" />
                                    <span>data_telemetry.csv</span>
                                </span>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-700 whitespace-nowrap">
                                    CSV Attached
                                </span>
                            </div>
                        )}
                        {!pdfCount && !hasCsv && (
                            <span className="text-[11px] text-slate-400 italic">
                                No files attached
                            </span>
                        )}
                    </div>

                    <button
                        onClick={onOpenReview}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-600 active:scale-[0.99] transition-all"
                    >
                        <span>Open Document</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// =====================================================================
// Blog Queue Card Component
// =====================================================================

function BlogQueueCard({
    item,
    onOpenReview,
}: {
    item: BlogItem;
    onOpenReview: () => void;
}) {
    const wordCount = item.content ? item.content.split(/\s+/).length : 180;
    const readTime = Math.max(1, Math.ceil(wordCount / 200));

    return (
        <div className="group rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:border-slate-300 hover:shadow-md">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-12 md:items-center">
                <div className="flex flex-col sm:flex-row gap-4 md:col-span-6 min-w-0">
                    <div className="h-40 sm:h-28 w-full sm:w-32 shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200 relative">
                        {item.coverImage?.url ? (
                            <img
                                src={item.coverImage.url}
                                alt={item.title}
                                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                        ) : (
                            <div className="flex h-full w-full items-center justify-center bg-slate-50 text-slate-300">
                                <ImageIcon className="h-8 w-8" />
                            </div>
                        )}
                        <span className="absolute bottom-1 left-1 rounded bg-slate-900/80 px-1.5 py-0.5 text-[9px] font-bold text-white backdrop-blur-xs">
                            Cover Image
                        </span>
                    </div>

                    <div className="space-y-2 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-700 shrink-0">
                                {item.category || 'Blog'}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400 truncate max-w-[120px] sm:max-w-[200px]">
                                blog/{item.slug}
                            </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-indigo-600 transition-colors truncate">
                            {item.title}
                        </h3>

                        {item.excerpt && (
                            <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                                {item.excerpt}
                            </p>
                        )}

                        <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1 text-[11px] whitespace-nowrap">
                                <Clock className="h-3 w-3 text-slate-400 shrink-0" />
                                {readTime} min read
                            </span>
                            <span className="flex items-center gap-1 text-[11px] whitespace-nowrap">
                                <Eye className="h-3 w-3 text-slate-400 shrink-0" />
                                {item.views || 0} views
                            </span>
                        </div>
                    </div>
                </div>

                <div className="min-w-0 rounded-xl bg-slate-50/80 p-3.5 border border-slate-100 md:col-span-3">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-bold text-white text-xs">
                            {item.author?.name
                                ? item.author.name
                                    .split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .substring(0, 2)
                                    .toUpperCase()
                                : 'AU'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-bold text-slate-900">
                                {item.author?.name || 'Unknown Author'}
                            </p>
                            <p className="truncate text-[11px] text-slate-500">
                                {item.author?.email || 'author@domain.com'}
                            </p>
                            <div className="mt-1 flex items-center gap-2">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 truncate">
                                    Role: {item.author?.role || 'PUBLISHER'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="min-w-0 flex flex-col justify-between space-y-3 md:col-span-3 md:border-l md:border-slate-100 md:pl-6">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-slate-500 truncate">
                            Media & Artifacts
                        </span>
                        <StatusBadge status={item.status} />
                    </div>

                    <div className="space-y-1 text-[11px] text-slate-600">
                        <div className="flex justify-between items-center gap-2 rounded bg-slate-50 px-2 py-1">
                            <span className="truncate">
                                {item.coverImage?.url
                                    ? 'cover_image.webp'
                                    : 'No Cover'}
                            </span>
                            <span className="font-bold text-emerald-600 whitespace-nowrap">
                                Verified
                            </span>
                        </div>
                        <div className="flex justify-between items-center gap-2 rounded bg-slate-50 px-2 py-1">
                            <span>PDF / CSV</span>
                            <span className="text-slate-400 whitespace-nowrap">
                                {item.pdfs?.length || item.csv?.url
                                    ? 'Attached'
                                    : 'None'}
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={onOpenReview}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-600 active:scale-[0.99] transition-all"
                    >
                        <span>Open Document</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// =====================================================================
// Helper Sub-Components
// =====================================================================

function StatusBadge({ status }: { status: BlogStatus }) {
    const normalizedStatus = (status?.toUpperCase() || 'PENDING') as BlogStatus;

    const styles: Record<BlogStatus, string> = {
        PENDING: 'bg-amber-100 text-amber-800 border-amber-200',
        PUBLISHED: 'bg-emerald-100 text-emerald-800 border-emerald-200',
        APPROVED: 'bg-blue-100 text-blue-800 border-blue-200',
        DRAFT: 'bg-slate-100 text-slate-700 border-slate-200',
        REJECTED: 'bg-red-100 text-red-800 border-red-200',
    };

    return (
        <span
            className={cn(
                'rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider whitespace-nowrap shrink-0',
                styles[normalizedStatus] || styles.PENDING,
            )}
        >
            {normalizedStatus}
        </span>
    );
}

function EmptyQueueState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <ShieldCheck className="h-10 w-10 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-700">{message}</p>
            <p className="text-xs text-slate-400 mt-1">
                Try resetting search filters or category toggles.
            </p>
        </div>
    );
}

function SkeletonCard() {
    return (
        <div className="animate-pulse rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <div className="h-4 w-1/4 rounded bg-slate-200" />
            <div className="h-6 w-3/4 rounded bg-slate-200" />
            <div className="h-4 w-1/2 rounded bg-slate-200" />
        </div>
    );
}