const express = require('express');
const router = express.Router();
const JobPost = require('../models/JobPost');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const User = require('../models/user');
const Settings = require('../models/Settings');
const CreditTransaction = require('../models/CreditTransaction');
const authMiddleware = require('../middlewares/authMiddleware');

// Customer creates job post
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, serviceType, location, schedule, bookingType, budgetBDT, isEmergency } = req.body;
    const settings = await Settings.findOne();

    // Emergency posts require emergencyPostEnabled
    if (isEmergency && !settings?.emergencyPostEnabled) {
      return res.status(400).json({ message: 'Emergency posts are not currently available' });
    }

    const emergencyCost = settings?.emergencyPostCreditCost ?? 1;
    let customer;
    if (isEmergency) {
      customer = await User.findById(req.user._id);
      if (customer.credits < emergencyCost) {
        return res.status(403).json({
          message: 'You do not have enough credits to post an emergency job. Please top up your credits.',
          currentCredits: customer.credits,
        });
      }
    }

    const post = await JobPost.create({
      customer: req.user._id,
      title, description, serviceType, location, schedule,
      bookingType, budgetBDT,
      isEmergency: !!isEmergency
    });

    if (isEmergency) {
      customer.credits -= emergencyCost;
      customer.totalCreditsUsed = (customer.totalCreditsUsed || 0) + emergencyCost;
      await customer.save();
      await CreditTransaction.create({
        professional: customer._id, type: 'deduct', credits: emergencyCost,
        note: 'Emergency post: ' + title,
        jobPostId: post._id,
      });
      console.log('Credit deducted:', customer.email, 'new balance:', customer.credits);
    }

    if (isEmergency && req.io) {
      const pros = await User.find({
        role: 'professional',
        isVerified: true,
        professionalType: serviceType,
        'location.division': location?.division
      }).select('_id');

      for (const pro of pros) {
        await Notification.create({
          user: pro._id, type: 'jobpost',
          message: 'URGENT: ' + title + ' - ' + (location?.thana || '') + ', ' + (location?.district || ''),
          link: '/job-posts/' + post._id
        });
        req.io.to(String(pro._id)).emit('newNotification', {
          type: 'emergency', message: 'URGENT job post in your area'
        });
      }
    }

    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create post', error: err.message });
  }
});

// Professionals browse open posts - ALL open posts visible to ALL professionals.
// Type/location filtering happens on the frontend only, as optional filters.
router.get('/', authMiddleware, async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== 'professional' && user.role !== 'admin') {
      return res.status(403).json({ message: 'Only professionals can browse job posts' });
    }

    const posts = await JobPost.find({
      status: 'Open',
      expiresAt: { $gt: new Date() }
    })
      .populate('customer', 'name location')
      .sort({ isEmergency: -1, createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load job posts' });
  }
});

// Customer views their own posts
router.get('/my-posts', authMiddleware, async (req, res) => {
  try {
    const posts = await JobPost.find({ customer: req.user._id })
      .populate('applicants.professional', 'name profilePhoto rating location professionalType')
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch your posts' });
  }
});

// Single post detail
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await JobPost.findById(req.params.id)
      .populate('customer', 'name location')
      .populate('applicants.professional', 'name profilePhoto rating location professionalType experience');
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ message: 'Failed to get post' });
  }
});

// Professional applies (FREE - no credit deducted here)
router.post('/:id/apply', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'professional')
      return res.status(403).json({ message: 'Only professionals can apply' });

    const post = await JobPost.findById(req.params.id);
    if (!post || post.status !== 'Open')
      return res.status(400).json({ message: 'Post is not available' });

    const alreadyApplied = post.applicants.some(
      a => a.professional.toString() === req.user._id.toString()
    );
    if (alreadyApplied)
      return res.status(400).json({ message: 'Already applied' });

    post.applicants.push({ professional: req.user._id });
    await post.save();

    await Notification.create({
      user: post.customer, type: 'jobpost',
      message: req.user.name + ' is interested in your job post: ' + post.title,
      link: '/my-posts'
    });

    res.json({ message: 'Applied successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to apply' });
  }
});

// Customer selects a professional (CREDIT DEDUCTED HERE)
router.post('/:id/select/:proId', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'customer')
      return res.status(403).json({ message: 'Only customers can select' });

    const post = await JobPost.findById(req.params.id);
    if (!post || post.customer.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    const settings = await Settings.findOne();
    const cost = settings?.jobSelectCreditCost ?? 1;

    const pro = await User.findById(req.params.proId);
    if (!pro) return res.status(404).json({ message: 'Professional not found' });

    if ((pro.credits || 0) < cost) {
      await Notification.create({
        user: pro._id, type: 'jobpost',
        message: 'You were selected for "' + post.title + '" but have insufficient credits. Top up within 24h to confirm.',
        link: '/my-credits'
      });
      return res.status(400).json({ message: 'Professional has insufficient credits. They have been notified to top up.' });
    }

    pro.credits = (pro.credits || 0) - cost;
    pro.totalCreditsUsed = (pro.totalCreditsUsed || 0) + cost;
    await pro.save();
    await CreditTransaction.create({
      professional: pro._id, type: 'deduct', credits: cost,
      note: 'Selected for job post: ' + post.title,
      jobPostId: post._id
    });
    console.log('Credit deducted:', pro.email, 'new balance:', pro.credits);

    // Update post
    post.status = 'InProgress';
    post.selectedPro = req.params.proId;
    post.applicants = post.applicants.map(a => ({
      ...a.toObject(),
      status: a.professional.toString() === req.params.proId ? 'Selected' : 'Rejected'
    }));
    await post.save();

    // Notify selected professional
    await Notification.create({
      user: pro._id, type: 'jobpost',
      message: 'You have been selected for the job: ' + post.title + '. You can now chat with the customer.',
      link: '/job-posts/' + post._id
    });

    res.json({ message: 'Professional selected', post });
  } catch (err) {
    res.status(500).json({ message: 'Failed to select', error: err.message });
  }
});

// Customer cancels post
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const post = await JobPost.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.customer.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    post.status = 'Cancelled';
    await post.save();
    res.json({ message: 'Post cancelled' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to cancel' });
  }
});

module.exports = router;
