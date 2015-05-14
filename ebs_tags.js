// find 'client' tags for EBS instances from the attached EC2 instances

// http://aws.amazon.com/sdk-for-node-js/
var AWS = require('aws-sdk');
var Promise = require('promise');

AWS.config.update({region: 'us-east-1'});
var ec2 = new AWS.EC2();


var getVolumes = Promise.denodeify(ec2.describeVolumes).bind(ec2);
var getInstances = Promise.denodeify(ec2.describeInstances).bind(ec2);

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

var getUntaggedVolumes = function() {
  // http://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/EC2.html#describeVolumes-property
  var params = {
    Filters: [
      // this should work but doesn't
      // https://forums.aws.amazon.com/thread.jspa?threadID=180551
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
  return getVolumes(params).then(function(data) {
    return data.Volumes.filter(function(volume) {
      return !findClientTag(volume);
    });
  });
};

var getInstance = function(volume) {
  // assume only a single attachment
  var attachment = volume.Attachments[0];
  var params = {
    InstanceIds: [
      attachment.InstanceId
    ]
  };

  var promise = getInstances(params).then(function(data) {
    var instance = data.Reservations[0].Instances[0];
    return instance;
  });

  return promise;
};

var findAssociatedClient = function(volume) {
  return getInstance(volume).then(function(instance) {
    client = findClientTag(instance);
    if (client) {
      console.log(volume.VolumeId + ' should have client tag ' + client);
    }
  });
};


getUntaggedVolumes().then(function(volumes) {
  var promises = volumes.map(findAssociatedClient);
  return Promise.all(promises);
}).catch(console.error);
