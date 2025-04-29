/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { DOMAIN } from "../constant/constant";
import axios from "axios";
import toast from "react-hot-toast";

const MediaPreview = ({ setSelectedMedia, msg }) => {
  const [mediaType, setMediaType] = useState("");
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

  const handleDownload = async () => {
    try {
      const response = await axios.post(
        DOMAIN + `api/v1/upload/download-file`,
        { url: msg },
        {
          responseType: "blob",
          withCredentials: true,
        }
      );

      const disposition =
        response.headers["content-disposition"] ||
        response.headers["Content-Disposition"];
      let filename = "file";

      if (disposition && disposition.includes("filename=")) {
        const match = disposition.match(/filename="?(.+?)"?$/);
        if (match && match[1]) {
          filename = decodeURIComponent(match[1]);
        }
      }

      console.log(response.headers);

      const blob = new Blob([response.data], {
        type: response.headers["content-type"] || "application/octet-stream",
      });

      const blobUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Error downloading file:", err);
      toast.error("Download failed.");
    }
  };

  useEffect(() => {
    setMediaType(getMediaType(msg));
  }, [setMediaType, msg]);

  return (
    <div className="absolute overflow-hidden justify-end w-full h-full font-slim z-50 bg-white/50 text-black flex px-2 flex-col">
      <div className="w-full h-auto bg-white/90 rounded-t-xl py-10 gap-5 items-center flex flex-col">
        <div className="w-full h-[10%] p-2 flex justify-between">
          <img
            onClick={() => setSelectedMedia(null)}
            src="/icons/crossblack.png"
            className="w-8 h-8 cursor-pointer"
          />
          <img
            onClick={handleDownload}
            src="/icons/download.png"
            className="w-8 h-8 cursor-pointer"
          />
        </div>
        {mediaType === "image" ? (
          <img
            src={msg}
            alt="Cloudinary Image"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
        ) : mediaType === "video" ? (
          <video controls className="max-w-full max-h-full rounded-lg">
            <source src={msg} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="w-full h-full flex px-2 items-center justify-center text-center">
            <img
              src="/icons/file.png"
              alt="File Icon"
              className="w-12 h-12 mb-2"
            />
            <p className="text-base break-words font-slim line-clamp-1 whitespace-normal truncate">
              {msg.substring(msg.lastIndexOf("/") + 1)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaPreview;
