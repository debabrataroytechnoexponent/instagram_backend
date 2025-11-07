const { validationResult } = require("express-validator");

const validateApiData = async(req, res, next)=>{
    // Form Validation //
    let errors = validationResult(req);
    if(!errors.isEmpty()){
        let msg = "";
        errors.array().forEach((e)=>{
            msg += e.msg+", "
        })
        return res.status(422).json({
            success: false,
            message: msg,
        })
    }
    else{
        next();
    }
// Form Validation //
}
module.exports = {
    validateApiData,
}
