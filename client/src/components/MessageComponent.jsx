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
      url.endsWith(".bmp")
    ) {
      return "image";
    } else if (
      url.endsWith(".mp4") ||
      url.endsWith(".mov") ||
      url.endsWith(".avi")
    ) {
      return "video";
    } else {
      return "other";
    }
  };

  const createDownloadableUrl = (url) => {
    return url.replace("/upload/", "/upload/fl_attachment/");
  };

  const mediaType = isCloudinaryUrl ? getMediaType(msg) : null;

  return (
    <div>
      {isCloudinaryUrl ? (
        <div className="w-auto text-sm break-words font-slim whitespace-normal">
          {mediaType === "image" ? (
            <a href={createDownloadableUrl(msg)} download>
              <img
                src={msg}
                alt="Cloudinary Image"
                className="max-w-full h-auto rounded-lg"
              />
            </a>
          ) : mediaType === "video" ? (
            <div>
              <video controls className="max-w-full h-auto rounded-lg">
                <source src={msg} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            </div>
          ) : (
            <a
              href={createDownloadableUrl(msg)}
              download
              className="w-[200px] flex gap-2 items-center justify-center h-[50px]"
            >
              <img className="w-5 h-5" src="/icons/file.png" />
              <p className="text-sm break-words font-slim whitespace-normal">
                {msg.substring(msg.lastIndexOf("/") + 1)}
              </p>
            </a>
          )}
        </div>
      ) : (
        <p className="w-auto text-sm break-words font-slim whitespace-normal">
          {msg}
        </p>
      )}
    </div>
  );
};

export default MessageComponent;
