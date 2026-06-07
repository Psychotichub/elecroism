import React, { useCallback, useMemo, useState } from 'react';
import { FiDownload, FiMapPin, FiMessageSquare } from 'react-icons/fi';
import { useCircuitStore } from '../../store/circuitStore';
import { useUiStore } from '../../store/uiStore';
import { useThemeStore, themeColors } from '../../store/themeStore';
import {
  formatReviewAnchorLabel,
  openReviewThreadCount,
  sortReviewThreads,
  threadPreviewText,
} from '../../utils/reviewComments';

const AUTHOR_KEY = 'electroism.reviewAuthor.v1';

function loadAuthor(): string {
  if (typeof window === 'undefined') return '';
  try {
    return window.localStorage.getItem(AUTHOR_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveAuthor(name: string): void {
  try {
    window.localStorage.setItem(AUTHOR_KEY, name);
  } catch {
    // ignore
  }
}

const ReviewCommentsSection: React.FC = () => {
  const theme = useThemeStore((s) => s.theme);
  const tc = themeColors[theme];
  const circuit = useCircuitStore((s) => s.circuit);
  const selectedId = useCircuitStore((s) => s.selectedId);
  const addReviewCommentOnComponent = useCircuitStore(
    (s) => s.addReviewCommentOnComponent
  );
  const addReviewCommentReply = useCircuitStore((s) => s.addReviewCommentReply);
  const resolveReviewCommentThread = useCircuitStore(
    (s) => s.resolveReviewCommentThread
  );
  const reopenReviewCommentThread = useCircuitStore(
    (s) => s.reopenReviewCommentThread
  );
  const deleteReviewCommentThread = useCircuitStore(
    (s) => s.deleteReviewCommentThread
  );
  const exportReviewCommentsPdf = useCircuitStore((s) => s.exportReviewCommentsPdf);
  const exportReviewCommentsJson = useCircuitStore(
    (s) => s.exportReviewCommentsJson
  );
  const placementMode = useUiStore((s) => s.reviewCommentPlacementMode);
  const setPlacementMode = useUiStore((s) => s.setReviewCommentPlacementMode);
  const setPendingReviewComment = useUiStore((s) => s.setPendingReviewComment);
  const activeThreadId = useUiStore((s) => s.activeReviewCommentId);
  const setActiveThreadId = useUiStore((s) => s.setActiveReviewCommentId);

  const [author, setAuthor] = useState(loadAuthor);
  const [newComment, setNewComment] = useState('');
  const [replyText, setReplyText] = useState('');
  const [msg, setMsg] = useState<string | null>(null);

  const threads = useMemo(
    () => sortReviewThreads(circuit.reviewComments ?? []),
    [circuit.reviewComments]
  );
  const openCount = useMemo(() => openReviewThreadCount(circuit), [circuit]);
  const activeThread = threads.find((t) => t.id === activeThreadId) ?? null;

  const persistAuthor = useCallback((value: string) => {
    setAuthor(value);
    saveAuthor(value);
  }, []);

  const handleAddOnSelection = useCallback(() => {
    setMsg(null);
    if (!selectedId) {
      setMsg('Select a component first, or use pin-at-pointer mode.');
      return;
    }
    const text = newComment.trim();
    if (!text) {
      setMsg('Enter a comment first.');
      return;
    }
    const id = addReviewCommentOnComponent(selectedId, text, author);
    if (!id) {
      setMsg('Could not pin comment to selection.');
      return;
    }
    setNewComment('');
    setActiveThreadId(id);
    setMsg('Comment pinned to selection.');
  }, [
    selectedId,
    newComment,
    author,
    addReviewCommentOnComponent,
    setActiveThreadId,
  ]);

  const handleReply = useCallback(() => {
    if (!activeThread) return;
    const text = replyText.trim();
    if (!text) return;
    addReviewCommentReply(activeThread.id, text, author);
    setReplyText('');
  }, [activeThread, replyText, author, addReviewCommentReply]);

  const handlePdf = useCallback(() => {
    setMsg(null);
    const err = exportReviewCommentsPdf();
    if (err) setMsg(err);
    else setMsg('Review comments PDF downloaded.');
  }, [exportReviewCommentsPdf]);

  const handleJson = useCallback(() => {
    setMsg(null);
    const err = exportReviewCommentsJson();
    if (err) setMsg(err);
    else setMsg('Review comments JSON downloaded.');
  }, [exportReviewCommentsJson]);

  return (
    <div className={`rounded-md border p-2 ${tc.border}`}>
      <h3
        className={`mb-1.5 text-[11px] font-bold uppercase tracking-wide ${tc.textMuted}`}
      >
        Review comments
      </h3>
      <p className={`mb-2 text-[10px] leading-snug ${tc.textMuted}`}>
        Pin review threads to components or canvas coordinates. Resolve when
        addressed; export as a PDF appendix or JSON for external review tools.
      </p>
      <p className={`mb-2 text-[10px] ${tc.text}`}>
        {threads.length === 0
          ? 'No comments on this sheet.'
          : `${threads.length} thread${threads.length === 1 ? '' : 's'} · ${openCount} open`}
      </p>

      <div className="mb-2">
        <label
          htmlFor="review-author"
          className={`mb-0.5 block text-[10px] ${tc.textMuted}`}
        >
          Your name (optional)
        </label>
        <input
          id="review-author"
          type="text"
          value={author}
          onChange={(e) => persistAuthor(e.target.value)}
          placeholder="Reviewer initials"
          className="input-field w-full py-1 text-xs"
        />
      </div>

      <div className="mb-2">
        <label
          htmlFor="review-new-comment"
          className={`mb-0.5 block text-[10px] ${tc.textMuted}`}
        >
          New comment
        </label>
        <textarea
          id="review-new-comment"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          rows={2}
          placeholder="Describe the issue or review note…"
          className="input-field w-full resize-y py-1 text-xs"
        />
      </div>

      <div className="mb-2 flex flex-wrap gap-1">
        <button
          type="button"
          onClick={() => {
            if (placementMode) {
              setPlacementMode(false);
              setPendingReviewComment(null);
              setMsg(null);
              return;
            }
            const text = newComment.trim();
            if (!text) {
              setMsg('Enter a comment first.');
              return;
            }
            setPendingReviewComment(text, author);
            setPlacementMode(true);
            setMsg('Click the canvas to place the comment pin.');
          }}
          className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[10px] text-white ${
            placementMode
              ? 'bg-amber-600 hover:bg-amber-500'
              : 'bg-slate-600 hover:bg-slate-500'
          }`}
        >
          <FiMapPin size={10} />
          {placementMode ? 'Cancel placement' : 'Pin at pointer'}
        </button>
        <button
          type="button"
          onClick={handleAddOnSelection}
          className="inline-flex items-center gap-1 rounded bg-indigo-700 px-2 py-1 text-[10px] text-white hover:bg-indigo-600"
        >
          <FiMessageSquare size={10} />
          Pin on selection
        </button>
      </div>

      {threads.length > 0 ? (
        <ul className="mb-2 max-h-40 space-y-1 overflow-y-auto">
          {threads.map((thread, index) => {
            const active = thread.id === activeThreadId;
            return (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => setActiveThreadId(thread.id)}
                  className={`w-full rounded border px-2 py-1.5 text-left text-[10px] ${
                    active
                      ? theme === 'dark'
                        ? 'border-amber-500/60 bg-amber-950/30'
                        : 'border-amber-400 bg-amber-50'
                      : `${tc.border} ${theme === 'dark' ? 'hover:bg-white/5' : 'hover:bg-black/[0.03]'}`
                  }`}
                >
                  <span
                    className={
                      thread.status === 'open'
                        ? 'font-semibold text-amber-400'
                        : tc.textMuted
                    }
                  >
                    #{index + 1}{' '}
                    {thread.status === 'open' ? 'Open' : 'Resolved'}
                  </span>
                  <span className={`ml-1 ${tc.text}`}>
                    {formatReviewAnchorLabel(circuit, thread)} —{' '}
                    {threadPreviewText(thread)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {activeThread ? (
        <div className={`mb-2 rounded border p-2 ${tc.border}`}>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-1">
            <span className={`text-[10px] font-semibold ${tc.textBright}`}>
              Thread — {formatReviewAnchorLabel(circuit, activeThread)}
            </span>
            <div className="flex gap-1">
              {activeThread.status === 'open' ? (
                <button
                  type="button"
                  onClick={() => resolveReviewCommentThread(activeThread.id)}
                  className="rounded bg-emerald-800 px-1.5 py-0.5 text-[10px] text-white hover:bg-emerald-700"
                >
                  Resolve
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => reopenReviewCommentThread(activeThread.id)}
                  className="rounded bg-slate-600 px-1.5 py-0.5 text-[10px] text-white hover:bg-slate-500"
                >
                  Reopen
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  deleteReviewCommentThread(activeThread.id);
                  setActiveThreadId(null);
                }}
                className="rounded bg-red-800/80 px-1.5 py-0.5 text-[10px] text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
          <ul className={`mb-2 space-y-1 text-[10px] ${tc.text}`}>
            {activeThread.messages.map((m) => (
              <li key={m.id}>
                <span className={tc.textMuted}>
                  {m.author ? `${m.author} · ` : ''}
                  {new Date(m.createdAt).toLocaleString()}
                </span>
                <p className="whitespace-pre-wrap">{m.body}</p>
              </li>
            ))}
          </ul>
          <div className="flex gap-1">
            <input
              type="text"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="Reply…"
              className="input-field min-w-0 flex-1 py-0.5 text-[10px]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleReply();
                }
              }}
            />
            <button
              type="button"
              onClick={handleReply}
              className="rounded bg-indigo-700 px-2 py-0.5 text-[10px] text-white hover:bg-indigo-600"
            >
              Reply
            </button>
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1">
        <button
          type="button"
          onClick={handlePdf}
          className="inline-flex items-center gap-1 rounded bg-indigo-700 px-2 py-1 text-[10px] text-white hover:bg-indigo-600"
        >
          <FiDownload size={10} />
          Review PDF
        </button>
        <button
          type="button"
          onClick={handleJson}
          className="inline-flex items-center gap-1 rounded bg-slate-600 px-2 py-1 text-[10px] text-white hover:bg-slate-500"
        >
          <FiDownload size={10} />
          JSON
        </button>
      </div>
      {msg ? <p className={`mt-2 text-[10px] ${tc.textMuted}`}>{msg}</p> : null}
    </div>
  );
};

export default ReviewCommentsSection;
