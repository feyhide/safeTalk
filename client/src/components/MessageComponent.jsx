/* eslint-disable react/prop-types */
const MessageComponent = ({ msg }) => {
  const cloudinaryUrlPattern =
    /https:\/\/res\.cloudinary\.com\/[a-zA-Z0-9]+\/.*/;

  const isCloudinaryUrl = cloudinaryUrlPattern.test(msg);

  const getMediaType = (url) => {
    if (
      url.endsWith(".jpg") ||
      url.endsWith(".jpeg") ||
      url.endsWith(".png") ||
      url.endsWith(".gif") ||
      url.endsWith(".bmp") ||
      url.endsWith(".webp")
    ) {
      return "image";
    } else if (
      url.endsWith(".mp4") ||
      url.endsWith(".mov") ||
      url.endsWith(".avi")
    ) {
      return "video";
    } else if (url.endsWith(".wav") || url.endsWith("mp3")) {
      return "audio";
    } else {
      return "other";
    }
  };

  const mediaType = isCloudinaryUrl ? getMediaType(msg) : null;

  return isCloudinaryUrl ? (
    mediaType === "image" ? (
      <div className="max-w-full max-h-full  w-[300px] h-[300px] flex items-center justify-center">
        <div>
          <img
            src={msg}
            alt="Cloudinary Image"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        </div>
      </div>
    ) : mediaType === "video" ? (
      <div className="max-w-full max-h-full w-[300px] h-[300px] flex relative items-center justify-center">
        <img src="/icons/play.png" className="absolute" />
        <video className="max-w-full max-h-full object-contain rounded-lg">
          <source src={msg} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>
    ) : mediaType === "audio" ? (
      <audio controls src={msg} />
    ) : (
      <div className="w-auto h-auto bg-slate-400 rounded-xl p-2 flex gap-2 items-center justify-center">
        <img className="w-5 h-5" src="/icons/file.png" />
        <p className=" text-sm break-words font-slim whitespace-normal w-full truncate">
          {msg.substring(msg.lastIndexOf("/") + 1)}
        </p>
      </div>
    )
  ) : (
    <p className="w-auto text-sm break-words font-slim whitespace-normal">
      {msg}
    </p>
  );
};

export default MessageComponent;
