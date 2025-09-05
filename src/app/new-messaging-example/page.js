"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useCallback,
  useMemo,
  useState,
} from "react";
import { useInView } from "@/hooks/use-viewable";

let PAGE_SIZE = 30;
let STEP = 3;
let BIG_ARRAY = Array.from({ length: 201 }, (_, i) => `Message ${200 - i}`);
BIG_ARRAY[200] = "Message ----------------------------> 0 (newest)";
BIG_ARRAY[150] = "Message ----------------------------> 50";
BIG_ARRAY[125] = "Message ----------------------------> 75";
BIG_ARRAY[100] = "Message ----------------------------> 100";
BIG_ARRAY[75] = "Message ----------------------------> 125";
BIG_ARRAY[50] = "Message ----------------------------> 150";
BIG_ARRAY[25] = "Message ----------------------------> 175";
BIG_ARRAY[0] = "Message ----------------------------> 200 (oldest)";

export default function Page() {
  let containerRef = useRef(null);
  let listRef = useRef(null);
  let topRef = useRef(null);
  let bottomRef = useRef(null);
  let [offset, setOffset] = useState(BIG_ARRAY.length - PAGE_SIZE);
  let [didInitialScroll, setDidInitialScroll] = useState(false);
  let [didInitialTopLoad, setDidInitialTopLoad] = useState(false);
  let maxOffset = BIG_ARRAY.length - PAGE_SIZE;
  let loadedAllOlderMessages = offset <= 0;
  let loadedAllNewerMessages = offset >= maxOffset;

  let displayMessages = useMemo(() => {
    let slice = BIG_ARRAY.slice(offset, offset + PAGE_SIZE);
    return slice;
  }, [offset]);

  let atTop = useInView(topRef, {
    rootRef: containerRef,
    threshold: 1,
    skip: !didInitialScroll,
  });

  let atBottom = useInView(bottomRef, {
    rootRef: containerRef,
    threshold: 1,
    skip: !didInitialScroll || !didInitialTopLoad,
  });

  let scrollToBottom = useCallback(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, []);

  useLayoutEffect(() => {
    if (!didInitialScroll) {
      scrollToBottom();
      setDidInitialScroll(true);
    }
  }, [scrollToBottom, didInitialScroll]);

  let loadMoreAtTop = useCallback(() => {
    if (!didInitialTopLoad) {
      setDidInitialTopLoad(true);
    }

    if (loadedAllOlderMessages || !containerRef.current) return;

    let container = containerRef.current;
    let list = listRef.current;

    let anchorElement = null;
    let anchorOffset = 0;

    if (list && list.children.length > 0) {
      let containerRect = container.getBoundingClientRect();
      for (let child of list.children) {
        let childRect = child.getBoundingClientRect();
        if (childRect.bottom > containerRect.top) {
          anchorElement = child;
          anchorOffset = childRect.top - containerRect.top;
          break;
        }
      }
    }

    let loadCount = Math.min(STEP, offset);

    setOffset((prevOffset) => {
      let newOffset = Math.max(0, prevOffset - loadCount);

      requestAnimationFrame(() => {
        if (anchorElement) {
          let newRect = anchorElement.getBoundingClientRect();
          let containerRect = container.getBoundingClientRect();
          let newAnchorOffset = newRect.top - containerRect.top;
          let delta = newAnchorOffset - anchorOffset;
          container.scrollTop += delta;
        }
      });

      return newOffset;
    });
  }, [offset, loadedAllOlderMessages, didInitialTopLoad]);

  let loadMoreAtBottom = useCallback(() => {
    if (loadedAllNewerMessages || !containerRef.current) return;

    let container = containerRef.current;
    let list = listRef.current;

    let anchorElement = null;
    let anchorOffset = 0;

    if (list && list.children.length > 0) {
      let containerRect = container.getBoundingClientRect();
      for (let i = list.children.length - 1; i >= 0; i--) {
        let child = list.children[i];
        let childRect = child.getBoundingClientRect();
        if (childRect.top < containerRect.bottom) {
          anchorElement = child;
          anchorOffset = childRect.top - containerRect.top;
          break;
        }
      }
    }

    let addCount = Math.min(STEP, maxOffset - offset);

    setOffset((prevOffset) => {
      let newOffset = Math.min(prevOffset + addCount, maxOffset);

      requestAnimationFrame(() => {
        if (anchorElement) {
          let newRect = anchorElement.getBoundingClientRect();
          let containerRect = container.getBoundingClientRect();
          let newAnchorOffset = newRect.top - containerRect.top;
          let delta = newAnchorOffset - anchorOffset;
          container.scrollTop += delta;
        }
      });

      return newOffset;
    });
  }, [offset, maxOffset, loadedAllNewerMessages]);

  useEffect(() => {
    if (didInitialScroll && atTop) {
      loadMoreAtTop();
    }
  }, [atTop, loadMoreAtTop, didInitialScroll]);

  useEffect(() => {
    if (didInitialScroll && didInitialTopLoad && atBottom) {
      loadMoreAtBottom();
    }
  }, [atBottom, loadMoreAtBottom, didInitialScroll, didInitialTopLoad]);

  return (
    <div className="bg-black h-screen w-screen overflow-hidden flex">
      <div className="m-5 h-full w-full">
        <div
          className="overflow-auto h-1/2 border scrollbar-hide"
          ref={containerRef}
          style={{ overflowAnchor: "none" }}
        >
          {!loadedAllOlderMessages ? (
            <>
              <div className="h-150" />
              <div ref={topRef} className="h-1" />
            </>
          ) : (
            <p className="text-white px-2 py-1 text-center">
              Loaded all messages
            </p>
          )}

          <div ref={listRef}>
            {displayMessages.map((val) => (
              <p key={val} data-key={val} className="text-white py-1">
                {val}
              </p>
            ))}
          </div>

          <div ref={bottomRef} className="h-1" />
          {!loadedAllNewerMessages && <div className="h-150" />}
        </div>
      </div>
    </div>
  );
}
