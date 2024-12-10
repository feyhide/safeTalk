import Joi from "joi"

const validator = (schema) => (payload) =>
    schema.validate(payload,{ abortEarly: false});

const searchingContactsSchema = Joi.object({
    username: Joi.string()
    .pattern(/^[a-z][a-z0-9_]*$/) 
    .min(3)
    .required()
    .messages({
      "string.pattern.base": "Username must start with a letter and contain only lowercase letters, numbers, or underscores.",
      "string.min": "Username must be at least 3 characters long.",
      "string.empty": "Username is required.",
    }),
})

const validateSearchingContacts = validator(searchingContactsSchema);


export {validateSearchingContacts}