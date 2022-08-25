const fs = require("fs");
const path = require("path");

const { validationResult } = require("express-validator/check");

const Post = require("../models/post");
const User = require("../models/user");

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  try {
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .skip((currentPage - 1) * perPage)
      .limit(perPage);
    res.status(200).json({
      message: "Fetched posts successfully.",
      posts: posts,
      totalItems: totalItems,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new Error("Validation failed, entered data is incorrect.");
    }
    if (!req.file) {
      throw new Error("No image provided.");
    }
    console.log(req.file);
    const imageUrl = req.file.path;
    const title = req.body.title;
    const content = req.body.content;
    let creator;
    const post = await new Post({
      title: title,
      content: content,
      imageUrl: imageUrl,
      creator: req.userId,
    }).save();
    const user = await User.findById(req.userId);
    creator = user;
    user.posts.push(post);
    const updateUser = await user.save();
    res.status(201).json({
      message: "Post created successfully!",
      post: post,
      creator: { _id: creator._id, name: creator.name },
    });
  } catch (error) {
    res.json({ message: error.message });
  }
};

exports.getPost = (req, res, next) => {
  const postId = req.params.postId;
  Post.findById(postId)
    .then((post) => {
      if (!post) {
        const error = new Error("Could not find post.");
        error.statusCode = 404;
        throw error;
      }
      res.status(200).json({ message: "Post fetched.", post: post });
    })
    .catch((err) => {
      if (!err.statusCode) {
        err.statusCode = 500;
      }
      next(err);
    });
};

exports.updatePost = async (req, res, next) => {
  try {
    const postId = req.params.postId;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new Error("Validation failed, entered data is incorrect.");
    }
    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;
    if (req.file) {
      imageUrl = req.file.path;
    }
    if (!imageUrl) {
      throw new Error("No file picked.");
    }
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error("Could not find post.");
    }
    if (post.creator.toString() !== req.userId) {
      throw new Error("Not authorized!");
    }
    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }
    post.title = title;
    post.imageUrl = imageUrl;
    post.content = content;
    const updatePost = await post.save();
    res.status(200).json({ message: "Post updated!", post: result });
  } catch (error) {
    res.json({
      message: error.message,
    });
  }
};

exports.deletePost = async (req, res, next) => {
  try {
    const postId = req.params.postId;
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error("Could not find post.");
    }
    if (post.creator.toString() !== req.userId) {
      throw new Error("Not authorized!");
    }
    clearImage(post.imageUrl);
    const deletedPost = await Post.findByIdAndRemove(postId);
    const user = await User.findById(req.userId);
    user.posts.pull(postId);
    await user.save();
    res.status(200).json({ message: "Deleted post.", Data: [deletedPost] });
  } catch (error) {
    res.json({ message: error.message });
  }
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => console.log(err ||'No Error'));
};
