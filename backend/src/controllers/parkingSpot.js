const ParkingSpot = require('../models/parkingSpot');
const User = require('../models/user');
var ParkingSpotManager = require("../manager/parkingSpot")

// New Changes for image upload
const aws = require("aws-sdk");
const multerS3 = require("multer-s3");
const multer = require("multer");
const path = require("path");
const url = require("url");
require("dotenv").config();

const s3 = new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY,
  secretAccessKey: process.env.AWS_SECRET_KEY,
  Bucket: process.env.AWS_BUCKET_NAME,
  Region: process.env.AWS_BUCKET_REGION,
});

const spotImgUpload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    region: process.env.AWS_BUCKET_REGION,
    acl: "public-read",
    key: function (req, file, cb) {
      // console.log("file.originalname : "+file.originalname);
      cb(
        null,
        "parkeasy/user/spot/images/" +
          path.basename(file.originalname, path.extname(file.originalname)) +
          "-" +
          Date.now() +
          path.extname(file.originalname)
      );
    },
  }),
  limits: { fileSize: 2000000 }, // In bytes: 2000000 bytes = 2 MB
  // fileFilter: function( req, file, cb ){
  // checkFileType( file, cb );
  // }
}).single("spotImage");

exports.addParkingSpot = (req, res) => {
  console.log("Inside register parkingSpot");
  spotImgUpload(req, res, (error) => {
    if (error) {
      console.log("errors", error);
      res.json({ error: error });
    } else {
        let imageLocation = "https://uber-eats-store-0144.s3.us-east-2.amazonaws.com/parkeasy/user/spot/images/defaultSpot-1638073107187.jpg"
      //if file not found, there should be a default image URL/ or we can have that file in the project structure which can be used in that scenario
      if (req.file === undefined) {
        console.log("No File Selected for parkingSpot, use default Image!");
      } else {
        const imageName = req.file.key;
        imageLocation = req.file.location;
        }
        console.log(imageLocation)
        const data = req.body;
        const newParkingSpot = new ParkingSpot({
          name: data.name,
          userId: data.userId,
          description: data.description,
          address: {
            addressLine1 : data.address.addressLine1,
            addressLine2 : data.address.addressLine2,
            city : data.address.city,
            state : data.address.state,
            country : data.address.country,
            zipCode : data.address.zipCode
          },
          latitude: data.latitude,
          longitude: data.longitude,
          rate: data.rate,
          email: data.email,
          contactNumber: data.contactNumber,
          availableFrom: data.availableFrom,
          availableTo: data.availableTo,
          startTime : data.startTime,
          endTime : data.endTime,
          spotImageUrl: imageLocation,
          location: {
            coordinates: [ data.longitude, data.latitude ]
          }
        });

        newParkingSpot.save((err, result) => {
          if (err) {
            console.error("ParkingSpot::Failed to save new slot", err);
            res
              .status(500)
              .send({ message: "Something went wrong!", err });
          } else {
            res.send({ spot: result });
          }
        });
      }
  });
};

// get all the available parkingspots
exports.getAllParkingSpots = (req,res) => {

    let rangeQuery = {};
    const { query } = req;
    const { lat, lng, max_dis } = query;
    const maxDistance = max_dis || 50; // in meters

    if (lat && lng) {
      rangeQuery["location"] = {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [ lng, lat]
          },
          $maxDistance: maxDistance * 1000
        }
      };
    };

    ParkingSpot.find(rangeQuery)
    .then(exercises => res.json(exercises))
    .catch(err => res.status(400).json('Error: ' + err));
}



// get a parkingspot based on parkingspot id
exports.getParkingSpotById = (req,res,next,id)=>{
    ParkingSpot.findById(id)
    .exec((err,parkingSpotId)=>{
        if(err)
        {
            return res.status(400).json({
                error: "Parking Spot Not Found"
            })
        }
        req.parkingSpotId = parkingSpotId;
        next();
    })
}

exports.getParkingSpot = (req,res) => {
    return res.json(req.parkingSpotId);
}


// update a parkingspot based on parkingspot id
exports.updateParkingSpot = (req,res) => {

    ParkingSpot.findByIdAndUpdate(
        { _id: req.parkingSpotId._id },
        { $set: req.body },
        { new: true, useFindAndModify: false },
        (err, parkingSpotId) => {
         if (err) {
         return res.status(400).json({
              error: "Updating the user is not successful!!"
         });
        }
        res.json(parkingSpotId);
        }
    )
}


// delete a parkingspot based on parkingspot id in body
exports.deleteParkingSpot = (req,res)=>{
    ParkingSpot.findByIdAndDelete(req.body.parkingSpotId,(err,spot)=>{
        if (err){
            console.log(err);
            return res.status(400).json({
                error: "No Parking Spot Deleted"
            });
        }
        else{
            console.log("Deleted : ", spot);
            return res.json();
        }
        
    })
}



// get all the parkingspots for a given user(owner)
exports.getAllParkingSpotsOfOwner = async (req,res)=>{
    console.log("Inside Controller")
    console.log(req.body.userID)
    let spots = await ParkingSpotManager.GetAllParkingSpotOfUser(req);
    if(spots==undefined || spots.hasOwnProperty('error'))
        return res.status(400).json(spots.error);
    return res.json(spots);
}

