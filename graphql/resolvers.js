// In: graphql/resolvers.js

const User = require('../models/user');
const Location = require('../models/location');
const SiteImage = require('../models/siteImage');
const TextContent = require('../models/textContent');
const HistoricalEvent = require('../models/historicalEvent');
const Comment = require('../models/comment');
const TownComment = require('../models/townComment');
const QRCodeModel = require('../models/qrCode');
const qrCodeService = require('../services/qrCodeService');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getAiSummaryAndSuggestions } = require('../services/geminiService');
const { verifyHistoricalFact } = require('../services/verificationService');
const { GraphQLUpload } = require('graphql-upload');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');
// NOTE: uuid is no longer needed here.

module.exports = {
  Upload: GraphQLUpload,

  Query: {
    hello: () => 'Welcome to Heritage Hub API!',
    getAllLocations: async (_, { status }) => {
        const filter = status ? { status } : { status: { $ne: 'rejected' } };
        return await Location.find(filter).populate('submittedBy');
    },
    getPendingLocations: async () => await Location.find({ status: 'pending' }).populate('submittedBy'),
    getSiteImages: async () => await SiteImage.find({}),
    getTextContents: async () => await TextContent.find({}),
    getHistoricalEvents: async () => await HistoricalEvent.find({}).sort({ month: 1, day: 1 }),
    getComments: async (_, { locationId }) => await Comment.find({ location: locationId, isFactVerified: true }).populate('author').sort({ createdAt: -1 }),
    getQrCodeForLocation: async (_, { locationId }) => {
      const existingQrCode = await QRCodeModel.findOne({ location: locationId });
      if (existingQrCode) return existingQrCode;
      return await qrCodeService.generate(locationId);
    },
    getWifiQrCode: async () => {
      const ssid = process.env.WIFI_SSID;
      const password = process.env.WIFI_PASSWORD;
      if (!ssid || !password) return null;
      const wifiConnectionString = `WIFI:T:WPA;S:${ssid};P:${password};;`;
      try {
        const dataUrl = await QRCode.toDataURL(wifiConnectionString);
        return { id: 'wifi-qr-code', dataUrl };
      } catch (err) {
        console.error('Wi-Fi QR Code Generation Failed:', err);
        throw new Error('Could not generate Wi-Fi QR code.');
      }
    },
    getCommentsForTown: async (_, { townName }) => {
      return await TownComment.find({ townName: townName, isFactVerified: true })
        .populate('author')
        .sort({ createdAt: -1 });
    },
    
    // --- NEW, SIMPLIFIED RESOLVER for Town QR Codes ---
    getQrCodeForTown: async (_, { townName }) => {
      // Use the environment variable for the base URL, falling back to localhost.
      const baseUrl = process.env.APP_HOST_URL || `http://localhost:3000`;
      // The URL now points directly to the town page.
      const url = `${baseUrl}/town/${encodeURIComponent(townName)}`;
      
      try {
        const dataUrl = await QRCode.toDataURL(url);
        // ID can be static as this is not a database entity.
        return { id: `qr-for-${townName}`, dataUrl };
      } catch (err) {
        console.error('Town QR Code Generation Failed:', err);
        throw new Error('Could not generate QR code for town.');
      }
    }
  },

  Mutation: {
    register: async (_, { username, email, password }) => {
        const existingUser = await User.findOne({ email });
        if (existingUser) throw new Error('User already exists with that email address.');
        const user = new User({ username, email, password });
        await user.save();
        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        return { token, user };
    },
    login: async (_, { email, password }) => {
        const user = await User.findOne({ email });
        if (!user) throw new Error('Invalid credentials. User not found.');
        const valid = await bcrypt.compare(password, user.password);
        if (!valid) throw new Error('Invalid credentials. Password incorrect.');
        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1d' });
        return { token, user };
    },
    submitLocation: async (_, { name, description, imageUrl, lat, lng }) => {
        const placeholderUserId = "65a000000000000000000000";
        const aiSummary = await getAiSummaryAndSuggestions(description);
        const location = new Location({ name, description, imageUrl, coordinates: { lat, lng }, submittedBy: placeholderUserId, aiSummary });
        await location.save();
        return location.populate('submittedBy');
    },
    approveLocation: async (_, { locationId }) => await Location.findByIdAndUpdate(locationId, { status: 'approved' }, { new: true }).populate('submittedBy'),
    addComment: async (_, { locationId, text }) => {
        const isVerified = await verifyHistoricalFact(text, "Namibia");
        if (!isVerified) throw new Error('This historical fact could not be verified.');
        const placeholderUserId = "65a00000000000000000000";
        const comment = new Comment({ text, location: locationId, author: placeholderUserId, isFactVerified: true });
        await comment.save();
        return comment.populate('author');
    },
    addCommentToTown: async (_, { townName, text }) => {
        const isVerified = await verifyHistoricalFact(text, townName);
        if (!isVerified) {
            throw new Error(`This historical fact could not be verified for ${townName}. Please check your fact and try again.`);
        }
        const placeholderUserId = "65a00000000000000000000";
        const comment = new TownComment({
            text,
            townName,
            author: placeholderUserId,
            isFactVerified: true
        });
        await comment.save();
        return comment.populate('author');
    },
    uploadSiteImage: async (_, { key, description, file }) => {
        const { createReadStream, filename } = await file;
        const stream = createReadStream();
        const newFilename = `${key}-${Date.now()}${path.extname(filename)}`;
        const imagePath = path.join(__dirname, `../public/uploads/${newFilename}`);
        const imageUrl = `/uploads/${newFilename}`;
        await new Promise((resolve, reject) => stream.pipe(fs.createWriteStream(imagePath)).on('finish', resolve).on('error', reject));
        return await SiteImage.findOneAndUpdate({ key }, { imageUrl, description }, { new: true, upsert: true });
    },
    deleteSiteImage: async (_, { key }) => {
        const image = await SiteImage.findOneAndDelete({ key });
        if (image) {
            const imagePath = path.join(__dirname, `../public${image.imageUrl}`);
            if (fs.existsSync(imagePath)) fs.unlink(imagePath, (err) => { if (err) console.error("Error deleting file:", err); });
        }
        return image;
    },
    updateTextContent: async (_, { key, content, page, description }) => await TextContent.findOneAndUpdate({ key }, { content, page, description }, { new: true, upsert: true }),
    addHistoricalEvent: async (_, { month, day, title, description, imageUrl, link }) => {
        const newEvent = new HistoricalEvent({ month, day, title, description, imageUrl, link });
        await newEvent.save();
        return newEvent;
    },
    updateHistoricalEvent: async (_, args) => {
        const { id, ...updateData } = args;
        const updatedEvent = await HistoricalEvent.findByIdAndUpdate(id, { $set: updateData }, { new: true });
        if (!updatedEvent) throw new Error('Event not found.');
        return updatedEvent;
    },
    deleteHistoricalEvent: async (_, { id }) => {
        const deletedEvent = await HistoricalEvent.findByIdAndDelete(id);
        if (!deletedEvent) throw new Error('Event not found.');
        return deletedEvent;
    },
    setFeaturedEvent: async (_, { id }) => {
        await HistoricalEvent.updateMany({}, { $set: { isFeatured: false } });
        const newFeaturedEvent = await HistoricalEvent.findByIdAndUpdate(id, { $set: { isFeatured: true } }, { new: true });
        if (!newFeaturedEvent) throw new Error('Event not found.');
        return newFeaturedEvent;
    },
    unsetFeaturedEvent: async () => await HistoricalEvent.findOneAndUpdate({ isFeatured: true }, { $set: { isFeatured: false } }, { new: true }),
  }
};