const Tour = require('./../models/tourModel');
const APIFeatures = require('./../utils/apiFeatures');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage,price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = catchAsync(async (req, res, next) => {
  console.log(req.query);

  // BUILD QUERY
  // 1a) Filtering
  // const queryObj = {...req.query}; // hard copy of object -> destructuring divide every properties from object and we make with curly brackets new object of these properties
  // const excludeFields = ['page', 'sort', 'limit', 'fields'];
  // excludeFields.forEach(el => delete queryObj[el]); // deleting from queryObj all queries speciefied in excludeFields array

  // // 2nd way of making queries
  // // const query = Tour.find()
  // //   .where('duration')
  // //   .equals(5)
  // //   .where('difficulty')
  // //   .equals('easy');

  // // 1b) Advanced filtering
  // let queryStr = JSON.stringify(queryObj);
  // queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
  // console.log(JSON.parse(queryStr));
  // // gte, gt, lt, lte
  // let query = Tour.find(JSON.parse(queryStr));

  // 2) Sorting
  // if(req.query.sort) {
  //   const sortBy = req.query.sort.split(',').join(' ');
  //   console.log(sortBy);
  //   query = query.sort(sortBy);
  //   // sort('price ratingsAverage')
  // } else {
  //   query = query.sort('-createdAt'); // default sorting
  // }

  // 3) Field limiting
  // if(req.query.fields) {
  //   const fields = req.query.fields.split(',').join(' ');
  //   query = query.select(fields);
  // } else {
  //   query = query.select('-__v')
  // }

  // 4) Pagination

  // page=2&limit=10
  // skip means how much results skip before querying
  // const page = req.query.page * 1 || 1;
  // const limit = req.query.limit * 1 || 100;
  // const skip = (page - 1) * limit;
  //   query = query.skip(skip).limit(limit);

  //   if (req.query.page) {
  //     const numTours = await Tour.countDocuments();
  //     if(skip >= numTours) throw new Error('This page does not exist');
  //   }

  // EXECUTE QUERY
  const features = new APIFeatures(Tour.find(), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate();
  const tours = await features.query;

  // SEND RESPONSE
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      tours
    }
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findById(req.params.id);

  if(!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour
    }
  });
});

exports.createTour = catchAsync(async (req, res, next) => {
  const newTour = await Tour.create(req.body);

  res.status(201).json({
    status: 'success',
    data: {
      tour: newTour
    }
  });
  // try {
  //   // const newTour = new Tour({});
  //   // newTour.save();


  // } catch (err) {
  //   res.status(400).json({
  //     status: 'fail',
  //     message: err
  //   });
  // }
});

exports.updateTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour
    }
  });
});

exports.deleteTour = catchAsync(async (req, res, next) => {
 const tour =  await Tour.findByIdAndDelete(req.params.id);

  if (!tour) {
    return next(new AppError('No tour found with that ID', 404));
  }

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        _id: { $toUpper: '$difficulty' },
        numTours: { $sum: 1 },
        numRatings: { $sum: '$ratingsQuantity' },
        avgRating: {
          $avg: '$ratingsAverage'
        },
        avgPrice: {
          $avg: '$price'
        },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },
    {
      $sort: { avgPrice: 1 }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1;
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },
    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { $month: '$startDates' },
        numTourStarts: { $sum: 1 },
        tours: {
          $push: '$name'
        }
      }
    },
    {
      $addFields: { month: '$_id' }
    },
    {
      // hide field
      $project: {
        _id: 0
      }
    },
    {
      $sort: { numTourStarts: -1 }
    },
    {
      // only reference for here cause it's not useful here
      $limit: 12
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
});
