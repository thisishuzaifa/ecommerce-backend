import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { authMiddleware, adminMiddleware } from "../middleware/auth";
import { uploadImage, deleteImage } from "../services/storage";

const imagesRouter = new Hono();

// All image routes require authentication
imagesRouter.use("/*", authMiddleware);

// Upload image(s) - admin only
imagesRouter.post("/upload", adminMiddleware, async (c) => {
  try {
    const formData = await c.req.formData();
    const files = formData.getAll('images') as File[];
    
    if (!files || files.length === 0) {
      throw new HTTPException(400, { message: "No images provided" });
    }
    
    // Validate file types
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        throw new HTTPException(400, { message: `Invalid file type: ${file.type}` });
      }
    }
    
    // Upload all images
    const uploadPromises = files.map(file => uploadImage(file));
    const imageUrls = await Promise.all(uploadPromises);
    
    return c.json({ imageUrls });
  } catch (error) {
    if (error instanceof HTTPException) throw error;
    console.error('Image upload error:', error);
    throw new HTTPException(500, { message: "Failed to upload images" });
  }
});

// Delete an image - admin only
imagesRouter.delete("/:imageUrl", adminMiddleware, async (c) => {
  try {
    const imageUrl = decodeURIComponent(c.req.param("imageUrl"));
    
    await deleteImage(imageUrl);
    
    return c.json({ message: "Image deleted successfully" });
  } catch (error) {
    console.error('Image deletion error:', error);
    throw new HTTPException(500, { message: "Failed to delete image" });
  }
});

export default imagesRouter; 