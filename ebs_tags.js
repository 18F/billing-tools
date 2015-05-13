// find 'client' tags for EBS instances from the attached EC2 instances

// http://aws.amazon.com/sdk-for-node-js/
var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});

var ec2 = new AWS.EC2();

var findClientTag = function(resource) {
  var tag;
  for (var i = 0; i < resource.Tags.length; i++) {
    tag = resource.Tags[i];
    if (tag.Key.toLowerCase() === 'client') {
      return tag.Value;
    }
  }

  return undefined;
};

var getInstance = function(volume, callback) {
  // assume only a single attachment
  var attachment = volume.Attachments[0];
  var params = {
    InstanceIds: [
      attachment.InstanceId
    ]
  };
  ec2.describeInstances(params, function(err, data) {
    if (err) {
      callback(err);
    } else {
      var instance = data.Reservations[0].Instances[0];
      callback(null, instance);
    }
  });
};


// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeVolumes-property
var params = {
  Filters: [
    // this should work but doesn't
    // {
    //   Name: 'tag:client',
    //   Values: [
    //     'not tagged'
    //   ]
    // }
    {
      Name: 'attachment.status',
      Values: [
        'attached'
      ]
    }
  ]
};
ec2.describeVolumes(params, function(err, data) {
  if (err) {
    console.log(err, err.stack);
  } else {
    // console.dir(data, {depth: null});
    data.Volumes.forEach(function(volume) {
      var client = findClientTag(volume);
      if (!client) {
        // assume only a single attachment
        getInstance(volume, function(err, instance) {
          if (err) {
            console.log(err, err.stack);
          } else {
            client = findClientTag(instance);
            if (client) {
              console.log(volume.VolumeId + ' should have client tag ' + client);
            }
          }
        });
      }
    });
  }
});
