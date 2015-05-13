// find 'client' tags for EBS instances from the associated EC2 instances

// http://aws.amazon.com/sdk-for-node-js/
var AWS = require('aws-sdk');
AWS.config.update({region: 'us-east-1'});

var ec2 = new AWS.EC2();

var findClient = function(resource) {
  var tag;
  for (var i = 0; i < resource.Tags.length; i++) {
    tag = resource.Tags[i];
    // TODO check for 'Client'
    if (tag.Key === 'client') {
      return tag.Value;
    }
  }

  return undefined;
};


// http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeVolumes-property
var params = {
  Filters: [
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
      var client = findClient(volume);

      if (!client) {
        // assume only a single attachment
        var attachment = volume.Attachments[0];
        var params = {
          InstanceIds: [
            attachment.InstanceId
          ]
        };
        ec2.describeInstances(params, function(err, data) {
          if (err) {
            console.log(err, err.stack);
          } else {
            var instance = data.Reservations[0].Instances[0];
            client = findClient(instance);
            if (client) {
              console.log('found for ' + volume.VolumeId);
            } else {
              console.log('not found for ' + volume.VolumeId);
            }
          }
        });
      }
    });
  }
});
