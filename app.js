const express = require('express');
const app = express();
const mongoose = require('mongoose');
const Image = require('./models/image');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Audio = require('./models/audio');
const AnimationVideo = require('./models/animeVideo');
const methodOverride = require('method-override');
const DanceVideo = require('./models/DanceVideo');
const nodemailer = require('nodemailer'); // For sending OTP emails
const crypto = require('crypto'); // For generating OTPs
const User = require('./models/user')
const sessions = {};
require('dotenv').config();

// Middleware Setup
app.use(methodOverride('_method'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Set view engine
app.set('view engine', 'ejs');

// Multer Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads'),
    filename: (req, file, cb) => cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
});

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP
}

const imageFilter = (req, file, cb) => {
    const allowedImageTypes = ["image/jpeg", "image/png", "image/gif"];
    allowedImageTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only image files are allowed!"), false);
};

const audioFilter = (req, file, cb) => {
    const allowedAudioTypes = ["audio/mpeg", "audio/mp3"];
    allowedAudioTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only audio files are allowed!"), false);
};

const videoFilter = (req, file, cb) => {
    const allowedVideoTypes = ["video/mp4", "video/avi", "video/mpeg"];
    allowedVideoTypes.includes(file.mimetype) ? cb(null, true) : cb(new Error("Only video files are allowed!"), false);
};

const uploadImage = multer({ storage, fileFilter: imageFilter });
const uploadAudio = multer({ storage, fileFilter: audioFilter });
const uploadVideo = multer({ storage, fileFilter: videoFilter, limits: { fileSize: 100 * 1024 * 1024 } });

// Connect to MongoDB
mongoose.connect(process.env.URI)
    .then(() => app.listen(process.env.PORT || 3000, () => console.log('Server started')))
    .catch(err => console.log(err));

// Routes

// Home Page
app.get('/', (req, res) => {
    res.render('home', { title: 'Home' });
});

// Signup and Signin Pages
app.get('/signup', (req, res) => {
    res.render('signup', { title: 'SignIn/SignUp' });
});
app.get('/signin', (req, res) => {
    res.render('signin', { title: 'SignIn/SignUp' });
});
app.get('/dance', (req, res) => {
    res.redirect('/dance-videos');
});

// Upload Pages
app.get('/upload', (req, res) => res.render('upload', { title: 'Upload' }));
app.get('/upload-paint', (req, res) => res.render('upload-paint', { title: 'Upload Paintings' }));
app.get('/upload-music', (req, res) => res.render('upload-music', { title: 'Upload Music' }));
app.get('/upload-dance', (req, res) => res.render('upload-dance', { title: 'Upload Dance Video' }));
app.get('/upload-anime', (req, res) => res.render('upload-anime', { title: 'Upload Animation Video' }));

// Paintings
app.get('/paintings', async (req, res) => {
    try {
        const images = await Image.find();
        res.render('paintings', { title: 'Paintings', items: images });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/paintings', uploadImage.single('image'), async (req, res) => {
    try {
        const obj = {
            name: req.body.name,
            desc: req.body.desc,
            img: {
                data: fs.readFileSync(path.join(__dirname, 'uploads', req.file.filename)),
                contentType: req.file.mimetype
            }
        };
        const image = new Image(obj);
        await image.save();
        res.redirect('/paintings');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error uploading painting');
    }
});

app.get('/paintings/:id', async (req, res) => {
    try {
        const image = await Image.findById(req.params.id);
        res.render('details', { image, title: 'Image Details' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.delete('/paintings/:id', async (req, res) => {
    try {
        const result = await Image.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).send('Painting not found');
        }
        res.json({ redirect: '/paintings' }); // Send redirect URL in JSON
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// Music
app.get('/music', async (req, res) => {
    try {
        const audioFiles = await Audio.find();
        res.render('music', { audioFiles, title: 'Music Library' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.post('/music', uploadAudio.single('file'), async (req, res) => {
    try {
        const obj = {
            title: req.body.title,
            description: req.body.description,
            file: {
                data: fs.readFileSync(path.join(__dirname, 'uploads', req.file.filename)),
                contentType: req.file.mimetype,
            },
            artist: req.body.artist || 'Unknown',
            genre: req.body.genre || 'Unknown',
            tags: req.body.tags ? req.body.tags.split(',') : [],
        };
        const audio = new Audio(obj);
        await audio.save();
        fs.unlinkSync(path.join(__dirname, 'uploads', req.file.filename));
        res.redirect('/music');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error uploading music');
    }
});
app.get('/music/:id', async (req, res) => {
    try {
        const audio = await Audio.findById(req.params.id); // Assuming your audio schema/model is named 'Audio'
        res.render('details2', { audio, title: 'Audio Details' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
app.delete('/music/:id', async (req, res) => {
    try {
        const result = await Audio.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).send('Audio file not found');
        }
        res.redirect('/music');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
// Dance Videos



app.post('/dance-videos', uploadVideo.single('file'), async (req, res) => {
    try {
        const obj = {
            title: req.body.title,
            description: req.body.description,
            choreographer: req.body.choreographer || 'Unknown',
            genre: req.body.genre || 'Unknown',
            tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
            fileUrl: `/uploads/${req.file.filename}`,
        };
        const video = new DanceVideo(obj);
        await video.save();
        res.redirect('/dance-videos');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error uploading video');
    }
});

app.get('/dance-videos', async (req, res) => {
    try {
        const videos = await DanceVideo.find(); // Fetches all videos
        res.render('dance', { title: 'Dance Videos', videos }); // Passes videos array to the template
        console.log(videos);
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/dance-videos/:id', async (req, res) => {
    try {
        const video = await DanceVideo.findById(req.params.id);
        res.render('details4', { video, title: 'Dance Video Details' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.delete('/dance-videos/:id', async (req, res) => {
    try {
        await DanceVideo.findByIdAndDelete(req.params.id);
        res.redirect('/dance-videos');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
app.post('/anime', uploadVideo.single('file'), async (req, res) => {
    try {
        const { title, description, artist, genre, tags, duration } = req.body;

        const videoData = {
            title,
            description,
            artist: artist || 'Unknown',
            genre: genre || 'General',
            tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
            duration: parseInt(duration) || 0,
            file: {
                data: fs.readFileSync(path.join(__dirname, 'uploads', req.file.filename)),
                contentType: req.file.mimetype,
            },
        };

        const newVideo = new AnimationVideo(videoData);
        await newVideo.save();

        fs.unlinkSync(path.join(__dirname, 'uploads', req.file.filename));  // Clean up uploaded file
        res.redirect('/anime');  // Redirect to the videos page
    } catch (err) {
        console.error(err);
        res.status(500).send('Error uploading video');
    }
});
app.get('/anime', async (req, res) => {
    try {
        // Fetch all animation videos
        const videos = await AnimationVideo.find().sort({ createdAt: -1 });
        
        // Render the template with the list of videos
        res.render('anime', { videos, title: 'Animation Videos Library' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Error retrieving videos');
    }
});
app.get('/anime/:id', async (req, res) => {
    try {
        const video = await AnimationVideo.findById(req.params.id);
        res.render('details4', { video, title: 'Anime Video Details' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
app.delete('/anime/:id', async (req, res) => {
    try {
        await AnimationVideo.findByIdAndDelete(req.params.id);
        res.redirect('/anime');
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});
async function sendEmail(email, otp) {
    const transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: { user: 'sahilsikri21@gmail.com', pass: 'sahilsikri21' },
    });
    await transporter.sendMail({
        from: 'your-email@gmail.com',
        to: email,
        subject: 'Your OTP Code',
        text: `Your OTP is: ${otp}`,
    });
}
app.post('/signup', async (req, res) => {
    const { username, email, password, stage } = req.body;

    if (stage === 'signup') {
        // Generate OTP and store it temporarily
        const otp = generateOTP();
        sessions[email] = { otp, username, password };

        await sendEmail(email, otp);
        return res.render('verify-otp', { email }); // Redirect to OTP page
    }
});
app.post('/verify-otp', async (req, res) => {
    const { email, otp, stage } = req.body;

    // Validate OTP
    if (sessions[email]?.otp === otp) {
        if (stage === 'signup') {
            // Create user
            const user = new User({ username: sessions[email].username, email, password: sessions[email].password });
            await user.save();
            delete sessions[email];
            return res.redirect('/signin');
        }
        if (stage === 'signin') {
            // Log user in
            delete sessions[email];
            return res.redirect('/dashboard');
        }
    }
    return res.status(400).send('Invalid OTP');
});
app.post('/signin', async (req, res) => {
    const { email, password } = req.body;

    const user = await User.findOne({ email, password });
    if (!user) return res.status(400).send('Invalid credentials');

    // Generate OTP and redirect to verification
    const otp = generateOTP();
    sessions[email] = { otp };
    await sendEmail(email, otp);

    return res.render('verify-otp', { email }); // Redirect to OTP page
});