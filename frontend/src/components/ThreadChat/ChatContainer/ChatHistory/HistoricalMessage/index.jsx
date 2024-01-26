import {memo, forwardRef} from "react";
import {Warning} from "@phosphor-icons/react";
import Jazzicon from "../../../../UserIcon";
import renderMarkdown from "@/utils/chat/markdown";
import {userFromStorage} from "@/utils/request";
import Citations from "../Citation";
import {AI_BACKGROUND_COLOR, USER_BACKGROUND_COLOR} from "@/utils/constants";
import {v4} from "uuid";
import ChatRating from "../Rating";

const HistoricalMessage = forwardRef(
  (
    {uuid = v4(), id, message, rating, role, workspace, thread, sources = [], error = false},
    ref
  ) => {
    return (
      <div
        key={uuid}
        ref={ref}
        className={`flex justify-center items-end w-full ${
          role === "user" ? USER_BACKGROUND_COLOR : AI_BACKGROUND_COLOR
        }`}
      >
        <div
          className={`py-8 px-4 w-full flex gap-x-5 md:max-w-[800px] flex-col`}
        >
          <div className="flex gap-x-5">
            <Jazzicon
              size={36}
              user={{
                uid:
                  role === "user"
                    ? userFromStorage()?.username
                    : `${workspace.slug}-${thread.id}`,
              }}
              role={role}
            />

            {error ? (
              <span
                className={`inline-block p-2 rounded-lg bg-red-50 text-red-500`}
              >
                <Warning className="h-4 w-4 mb-1 inline-block"/> Could not
                respond to message.
              </span>
            ) : (
              <span
                className={`prose prose-invert
                  prose-headings:mb-1 prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-lg
                  prose-p:mt-0 prose-ul:mt-0 prose-ol:mt-0
                  text-white font-normal text-sm md:text-sm flex flex-col gap-y-2 mt-2 [&>li]:p-10`}
                dangerouslySetInnerHTML={{__html: renderMarkdown(message)}}
              />
            )}
          </div>
          {role === "assistant" && <Citations sources={sources}/>}
          {role === "assistant" && id &&
            <ChatRating workspace={workspace} thread={thread} id={id} initialRating={rating}/>}
        </div>
      </div>
    );
  }
);

export default memo(HistoricalMessage);
