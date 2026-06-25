import type { Request, Response } from 'express';
import { imagekit } from '../lib/imagekit';

export class UploadController {
    // Upload a file to ImageKit
    static async uploadFile(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const file = req.file;
            if (!file) {
                return res.status(400).json({ message: 'No file uploaded' });
            }

            const folder = (req.body.folder as string) || 'taskforge';

            // Upload directly to ImageKit from buffer
            const uploadResult = await imagekit.upload({
                file: file.buffer,
                fileName: file.originalname,
                folder: folder,
            });

            return res.status(201).json({
                message: 'File uploaded successfully',
                url: uploadResult.url,
                fileId: uploadResult.fileId,
                name: uploadResult.name,
                size: uploadResult.size,
                type: uploadResult.fileType || file.mimetype
            });
        } catch (error: any) {
            console.error('Error uploading file to ImageKit:', error);
            return res.status(500).json({ message: error.message || 'File upload failed' });
        }
    }

    // Delete a file from ImageKit
    static async deleteFile(req: Request, res: Response) {
        try {
            const user = (req as any).user;
            if (!user) return res.status(401).json({ message: 'Unauthorized' });

            const { fileId } = req.params;
            if (!fileId) {
                return res.status(400).json({ message: 'File ID is required' });
            }

            await imagekit.deleteFile(fileId);
            return res.status(200).json({
                message: 'File deleted successfully from ImageKit'
            });
        } catch (error: any) {
            console.error('Error deleting file from ImageKit:', error);
            return res.status(500).json({ message: error.message || 'Failed to delete file' });
        }
    }
}
