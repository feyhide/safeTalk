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
      <div className="absolute overflow-hidden justify-end w-full h-full font-slim z-50 text-white flex px-2 flex-col">
        <div className="bg-white/90 w-full h-[90%] rounded-t-xl">
          <div className="w-full h-[10%] p-2 flex">
            <img
              onClick={() => setUpload(false)}
              src="/icons/crossblack.png"
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
              <div className="w-full h-full flex gap-2 flex-col items-center justify-center relative">
                <div className="w-full h-[80%] rounded-md">
                  {selectedFile && (
                    <div className="w-full h-full relative flex flex-col items-center justify-center px-5">
                      {selectedFile.type.startsWith("image/") && (
                        <img
                          src={URL.createObjectURL(selectedFile)}
                          alt={selectedFile.name}
                          className="max-w-full max-h-full object-contain rounded-md"
                        />
                      )}
                      {selectedFile.type.startsWith("video/") && (
                        <video
                          controls
                          src={URL.createObjectURL(selectedFile)}
                          className="max-w-full max-h-full object-contain rounded-md"
                        />
                      )}
                      {!selectedFile.type.startsWith("image/") &&
                        !selectedFile.type.startsWith("video/") && (
                          <div className="text-black text-md rounded-md px-2 bg-gray-400 w-full h-full flex items-center justify-center">
                            <p className="truncate">{selectedFile.name}</p>
                          </div>
                        )}
                    </div>
                  )}
                </div>
                <div className="w-full h-auto px-2 flex items-center gap-2">
                  <button
                    className="min-w-16 h-16 bg-blue-400 rounded-xl flex items-center justify-center cursor-pointer"
                    onClick={openFilePicker}
                  >
                    <img src="/icons/addblack.png" className="w-8 h-8" />
                  </button>
                  <div className="flex gap-2 items-center overflow-x-auto customScroll w-full  bg-black/20 rounded-xl">
                    {files.map((file, index) => {
                      const fileType = file.type.split("/")[0];
                      return (
                        <div
                          onClick={() => {
                            setSelectedFile(file);
                          }}
                          key={index}
                          className="relative my-2 min-w-16 min-h-16 flex flex-col items-center justify-center"
                        >
                          {selectedFile === file && (
                            <div className="absolute w-full h-full z-50 rounded-md bg-black/20 items-center justify-center flex">
                              <img
                                onClick={() => deleteFile(selectedFile)}
                                src="/icons/deletered.png"
                                className="w-8 h-8 cursor-pointer"
                              />
                            </div>
                          )}
                          {fileType === "image" && (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              className="max-w-16 max-h-16 object-cover rounded-md"
                            />
                          )}

                          {fileType === "video" && (
                            <video
                              src={URL.createObjectURL(file)}
                              className="w-16 h-16 rounded-md object-cover"
                            />
                          )}

                          {fileType !== "image" && fileType !== "video" && (
                            <div className="text-black text-xs rounded-md px-2 bg-gray-400 w-16 h-16 flex items-center justify-center">
                              <p className="truncate">{file.name}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button
                    className="min-w-16 h-16 bg-green-500 rounded-xl flex items-center justify-center cursor-pointer"
                    onClick={() => fileUpload(files)}
                  >
                    <img src="/icons/send.png" className="w-8 h-8" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Upload;
