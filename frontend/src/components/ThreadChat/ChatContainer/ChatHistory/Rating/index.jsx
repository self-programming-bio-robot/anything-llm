import {ThumbsUp, ThumbsDown} from "@phosphor-icons/react";
import React, {memo, useCallback, useState} from "react";
import IconButton from "@/components/IconButton/index.jsx";
import Workspace from "@/models/workspace.js";

function ChatRating({ workspace, thread, id, initialRating = 0 }) {
  const [rating, setRating] = useState(initialRating);
  const [upLoading, setUpLoading] = useState(false);
  const [downLoading, setDownLoading] = useState(false);

  const upRating = useCallback(() => {
    const newValue = rating === 1 ? 0 : 1;
    Workspace.rateAnswer(workspace.slug, thread.id, id, newValue).then((res) => {
      if (res) {
        setRating(res.rating);
      } else {
        setRating(rating);
      }
      setUpLoading(false);
    });
    setRating(newValue);
    setUpLoading(true);
  }, [rating]);

  const downRating = useCallback(() => {
    const newValue = rating === -1 ? 0 : -1;
    Workspace.rateAnswer(workspace.slug, thread.id, id, newValue).then((res) => {
      if (res) {
        setRating(res.rating);
      } else {
        setRating(rating);
      }
      setDownLoading(false);
    });
    setRating(newValue);
    setDownLoading(true);
  }, [rating]);

  return (
    <div className="flex flex-row items-right justify-end ml-auto">
      {upLoading
        ? <div className="h-[20px] w-[20px] m-1 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        : <IconButton Icon={ThumbsUp} onClick={upRating} className="p-1" pressed={rating > 0}/>
      }
      {downLoading
        ? <div className="h-[20px] w-[20px] m-1 animate-spin rounded-full border-4 border-solid border-primary border-t-transparent"></div>
        : <IconButton Icon={ThumbsDown} onClick={downRating} className="p-1" pressed={rating < 0}/>
      }
    </div>
  );
}

export default memo(ChatRating);
