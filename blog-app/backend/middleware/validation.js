const Joi = require('joi');

// Validation schemas
const schemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(100).required()
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  }),

  connectSite: Joi.object({
    siteUrl: Joi.string().uri().required(),
    username: Joi.string().required(),
    appPassword: Joi.string().required()
  }),

  createPost: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    content: Joi.string().required(),
    excerpt: Joi.string().max(300).optional(),
    status: Joi.string().valid('draft', 'publish').default('draft'),
    featuredImage: Joi.string().optional()
  }),

  updatePost: Joi.object({
    title: Joi.string().min(1).max(200).optional(),
    content: Joi.string().optional(),
    excerpt: Joi.string().max(300).optional(),
    status: Joi.string().valid('draft', 'publish').optional(),
    featuredImage: Joi.string().optional()
  }),

  saveDraft: Joi.object({
    title: Joi.string().min(1).max(200).required(),
    content: Joi.string().required(),
    excerpt: Joi.string().max(300).optional(),
    featuredImage: Joi.string().optional()
  })
};

// Validation middleware factory
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];
    
    if (!schema) {
      return res.status(500).json({
        success: false,
        message: 'Validation schema not found'
      });
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all validation errors
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    req.validatedData = value; // Add validated data to request
    next();
  };
};

module.exports = {
  validate,
  schemas
};