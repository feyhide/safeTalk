/* eslint-disable no-unused-vars */
/* eslint-disable react/prop-types */
import { useState, useRef } from "react";

const Upload = ({ fileUpload, upload, setUpload }) => {
  const [files, setFiles] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef();

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);

    const totalSize = selectedFiles.reduce((acc, file) => acc + file.size, 0);

    if (totalSize > 50 * 1024 * 1024) {
      alert("Total file size must be less than 50 MB!");
      return;
    }

    setFiles((prev) => [...prev, ...selectedFiles]);
    setSelectedFile(selectedFiles[0]);
  };

  const deleteFile = (fileToDelete) => {
    setFiles((prevFiles) => {
      const updatedFiles = prevFiles.filter((file) => file !== fileToDelete);
      if (selectedFile === fileToDelete) {
        setSelectedFile(updatedFiles.length > 0 ? updatedFiles[0] : null);
      }

      return updatedFiles;
    });
    fileInputRef.current.value = null;
  };

  const openFilePicker = () => {
    fileInputRef.current.click();
  };

  return (
    <>
      <div className="absolute overflow-hidden w-full h-full font-slim bg-blue-400 z-50 text-white flex p-2 flex-col">
        <div className="w-full h-[10%] p-2 flex">
          <img
            onClick={() => setUpload(false)}
            src="/icons/cross.png"
            className="w-8 h-8 cursor-pointer"
          />
        </div>
        <div className="w-full h-[80%] flex flex-col items-center justify-center text-black">
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
            multiple
          />

          {files.length === 0 ? (
            <div className="flex flex-col items-center justify-center">
              <p>No files selected.</p>
              <button
                onClick={openFilePicker}
                className="mt-4 p-2 bg-blue-500 text-white rounded-xl"
              >
                Choose Files
              </button>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center relative">
              <div className="w-full h-[80%] bg-white rounded-md relative">
                {selectedFile && (
                  <div className="w-full h-full flex flex-col items-center">
                    <div className="absolute w-full h-[10%] p-2 flex">
                      <img
                        onClick={() => deleteFile(selectedFile)}
                        src="/icons/crossblack.png"
                        className="w-8 h-8 cursor-pointer"
                      />
                    </div>
                    {selectedFile.type.startsWith("image/") && (
                      <img
                        src={URL.createObjectURL(selectedFile)}
                        alt={selectedFile.name}
                        className="w-full h-full object-contain rounded-md"
                      />
                    )}
                    {selectedFile.type.startsWith("video/") && (
                      <video
                        controls
                        src={URL.createObjectURL(selectedFile)}
                        className="w-full h-full object-contain rounded-md"
                      />
                    )}
                    {!selectedFile.type.startsWith("image/") &&
                      !selectedFile.type.startsWith("video/") && (
                        <div className="text-black text-md rounded-md px-2 bg-white w-full h-full flex items-center justify-center">
                          <p className="truncate">{selectedFile.name}</p>
                        </div>
                      )}
                  </div>
                )}
              </div>
              <div className="w-full h-auto">
                <div className="flex gap-2 items-center overflow-x-auto ">
                  {files.map((file, index) => {
                    const fileType = file.type.split("/")[0];

                    return (
                      <div
                        onClick={() => {
                          setSelectedFile(file);
                        }}
                        key={index}
                        className="my-2 flex flex-col items-center"
                      >
                        {fileType === "image" && (
                          <img
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="max-w-16 h-16 object-cover rounded-md"
                          />
                        )}

                        {fileType === "video" && (
                          <video
                            src={URL.createObjectURL(file)}
                            className="max-w-16 h-16 rounded-md object-cover"
                          />
                        )}

                        {fileType !== "image" && fileType !== "video" && (
                          <div className="text-black text-xs rounded-md px-2 bg-white w-16 h-16 flex items-center">
                            <p className="truncate">{file.name}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {files.length > 0 && (
          <div className="w-full h-[10%] flex gap-4 items-center justify-center">
            <div
              className="w-[10%] bg-white py-2 rounded-xl flex items-center justify-center cursor-pointer"
              onClick={openFilePicker}
            >
              <img src="/icons/addblack.png" className="w-8 h-8" />
            </div>

            <button
              onClick={() => fileUpload(files)}
              className="p-2 bg-green-500 text-white rounded-xl"
            >
              Upload
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default Upload;
