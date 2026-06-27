import { useState, useRef } from 'react';
import { UploadCloud, File, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { uploadFile } from '../Services/uploadApi';
import toast from 'react-hot-toast';

const ImageKitUpload = ({
    folder = 'taskforge',
    onUploadSuccess,
    onUploadStart,
    allowedTypes = ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
    maxSizeMB = 10,
    className = ''
}) => {
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const fileInputRef = useRef(null);

    const validateFile = (file) => {
        // Validate size
        if (file.size > maxSizeMB * 1024 * 1024) {
            toast.error(`File is too large. Maximum size allowed is ${maxSizeMB}MB.`);
            return false;
        }

        // Validate type
        const matchesType = allowedTypes.some(type => {
            if (type.endsWith('/*')) {
                const prefix = type.split('/')[0];
                return file.type.startsWith(prefix + '/');
            }
            return file.type === type;
        });

        if (!matchesType && allowedTypes.length > 0) {
            // Allow general upload if type couldn't be parsed, but warn
            if (!file.type) return true;
            toast.error('File type not supported.');
            return false;
        }

        return true;
    };

    const handleUpload = async (file) => {
        if (!validateFile(file)) return;

        try {
            setUploading(true);
            setUploadedFile(null);
            if (onUploadStart) onUploadStart();

            const data = await uploadFile(file, folder);
            
            // Append fileId to URL as a hash (elegant way to store fileId without changing DB schema)
            const fileUrlWithId = `${data.url}#${data.fileId}`;
            
            const fileDetails = {
                fileName: data.name,
                fileUrl: fileUrlWithId,
                fileSize: data.size,
                fileType: data.type
            };

            setUploadedFile(fileDetails);
            toast.success('File uploaded successfully!');
            if (onUploadSuccess) onUploadSuccess(fileDetails);
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error(error.response?.data?.message || 'File upload failed');
        } finally {
            setUploading(false);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUpload(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleUpload(e.target.files[0]);
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current.click();
    };

    return (
        <div className={`w-full ${className}`}>
            <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={triggerFileInput}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center min-h-[140px] bg-white ${
                    dragActive 
                        ? 'border-blue-500 bg-blue-50/30' 
                        : uploading
                        ? 'border-indigo-300 bg-gray-50/50'
                        : 'border-gray-300 hover:border-blue-400 bg-white shadow-sm'
                }`}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleChange}
                />

                {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                        <Loader className="w-10 h-10 text-indigo-600 animate-spin" />
                        <div>
                            <p className="text-xs font-bold text-gray-700">Uploading to ImageKit...</p>
                            <p className="text-xxs text-gray-400 mt-1">Please keep this tab open</p>
                        </div>
                    </div>
                ) : uploadedFile ? (
                    <div className="flex flex-col items-center gap-2">
                        <CheckCircle className="w-10 h-10 text-emerald-500" />
                        <div>
                            <p className="text-xs font-bold text-gray-800 truncate max-w-[250px]">{uploadedFile.fileName}</p>
                            <p className="text-xxs text-emerald-600 font-semibold mt-0.5">Upload complete! Click or drag to change</p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <UploadCloud className="w-10 h-10 text-gray-400 hover:text-blue-500 transition-colors" />
                        <div>
                            <p className="text-xs font-bold text-gray-700">
                                Drag & drop file, or <span className="text-blue-600 hover:underline">browse</span>
                            </p>
                            <p className="text-xxs text-gray-400 mt-1">
                                Files up to {maxSizeMB}MB supported
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ImageKitUpload;
