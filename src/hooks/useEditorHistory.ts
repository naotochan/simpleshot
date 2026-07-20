import { useCallback, useRef, useState } from "react";
import type { Annotation } from "../types/annotation";

export function useEditorHistory() {
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [history, setHistory] = useState<Annotation[][]>([[]]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const annotationsRef = useRef<Annotation[]>([]);
  const historyRef = useRef<Annotation[][]>([[]]);
  const historyIndexRef = useRef(0);
  annotationsRef.current = annotations;
  historyRef.current = history;
  historyIndexRef.current = historyIndex;

  const resetHistory = useCallback((anns: Annotation[] = []) => {
    setAnnotations(anns);
    setHistory([anns]);
    setHistoryIndex(0);
    historyRef.current = [anns];
    historyIndexRef.current = 0;
  }, []);

  const pushHistory = useCallback((anns: Annotation[]) => {
    setAnnotations(anns);
    const next = historyRef.current.slice(0, historyIndexRef.current + 1);
    next.push(anns);
    historyRef.current = next;
    setHistory(next);
    const newIdx = next.length - 1;
    historyIndexRef.current = newIdx;
    setHistoryIndex(newIdx);
  }, []);

  const handleUndo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0) return;
    const newIdx = idx - 1;
    historyIndexRef.current = newIdx;
    setHistoryIndex(newIdx);
    setAnnotations(historyRef.current[newIdx]);
  }, []);

  const handleRedo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx >= historyRef.current.length - 1) return;
    const newIdx = idx + 1;
    historyIndexRef.current = newIdx;
    setHistoryIndex(newIdx);
    setAnnotations(historyRef.current[newIdx]);
  }, []);

  return {
    annotations,
    setAnnotations,
    annotationsRef,
    history,
    historyIndex,
    resetHistory,
    pushHistory,
    handleUndo,
    handleRedo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
  };
}
