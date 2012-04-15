var perfume = (function() {
  var exports = {};

  function BvhLine(_str) {
    //this.lineType;
    //this.boneType;
    //this.boneName;
    this.offsetX = 0;
    this.offsetY = 0;
    this.offsetZ = 0;
    this.numChannels = 0;
    //this.channelsProps = [];
    this.numFrames = 0;
    this.frameTime = 0;
    //this.frames = [];

    this.parse(_str);
  }

  function isWhitespace(character) {
    switch (character){
    case " ":
    case "\t":
    case "\r":
    case "\n":
    case "\f":
      return true;

    default:
      return false;
    }
  }

  function trim(str) {
    var startIndex = 0;
    while (isWhitespace(str.charAt(startIndex)))
      ++startIndex;

    var endIndex = str.length - 1;
    while (isWhitespace(str.charAt(endIndex)))
      --endIndex;

    if (endIndex >= startIndex)
      return str.slice(startIndex, endIndex + 1);
    else
      return "";
  }

  BvhLine.prototype.parse = function(_str) {
    var _lineStr = _str;
    _lineStr = trim(_lineStr);

    var words = _lineStr.split(" ");
    if (String(words[0]).indexOf("Frames:") != -1) {
      words[0] = "Frames:";
      words.push(_lineStr.split(":")[1]);
    }
    if (words[0] === "Frame" && words.length === 2) {
      words[1] = "Time:";
      words[2] = _lineStr.split(":")[1];
    }
    if (!isNaN(Number(words[0]))){
      this.lineType = "FRAME";
    } else {
      this.lineType = words[0];
    }

    switch (this.lineType){
    case "HIERARCHY":
      break;
    case "ROOT":
    case "JOINT":
      this.boneType = (words[0] == "ROOT") ? "ROOT" : "JOINT";
      this.boneName = words[1];
      break;
    case "OFFSET":
      this.offsetX = Number(words[1]);
      this.offsetY = Number(words[2]);
      this.offsetZ = Number(words[3]);
      break;
    case "CHANNELS":
      this.numChannels = Number(words[1]);
      this.channelsProps = [];
      for (var i = 0; i < this.numChannels; i++) this.channelsProps.push( words[i+2] );
      break;
    case "Frames:":
      this.numFrames = Number(words[1]);
      break;
    case "Frame":
      this.frameTime = Number(words[2]);
      break;
    case "End":
    case "{":
    case "}":
    case "MOTION":
      break;
    case "FRAME":
      this.frames = _.map(words, Number);
      break;
    }
  };

  function BvhParser(_bvh, _str, _material) {
    //this.lines:Vector.<BvhLine>
    //this.currentLine:uint;

    this.lines = _.map(_str.split("\n"), function(_line_str) {
      return new BvhLine(_line_str);
    });

    this.currentLine = 1;
    _bvh.rootBone = this.parseBone(_bvh.bones);

    var currentLine;
    for (currentLine = 0; currentLine < this.lines.length; currentLine++) {
      if (this.lines[currentLine].lineType == "MOTION") break;
    }

    currentLine++;
    var _numFrames = this.lines[currentLine].numFrames;
    _bvh.numFrames = _numFrames;
    currentLine++;
    _bvh.frameTime = this.lines[currentLine].frameTime;
    currentLine++;

    var _frames = [];
    var i;
    var l = this.lines.length;
    for (i = currentLine; i < l; i++) {
      _frames.push(this.lines[i].frames);
    }
    _bvh.frames = _frames;

    _numFrames = _bvh.numFrames = _frames.length;
  }

  BvhParser.prototype.parseBone = function(_bones) {
    var bone = new THREE.Mesh(
      new THREE.CubeGeometry(2, 2, 2), new THREE.MeshBasicMaterial({color: Math.random() * 0xffffff})
    );
    _bones.push(bone);
    bone.name = this.lines[this.currentLine].boneName;

    this.currentLine++;
    this.currentLine++;
    bone.position.set(
      this.lines[this.currentLine].offsetX + 0.1,
      this.lines[this.currentLine].offsetY + 0.1,
      this.lines[this.currentLine].offsetZ + 0.1
    );

    this.currentLine++;
    bone.numChannels = this.lines[this.currentLine].numChannels;
    bone.channels = this.lines[this.currentLine].channelsProps;

    this.currentLine++;

    while (this.currentLine < this.lines.length){
      switch (this.lines[this.currentLine].lineType){
      case "ROOT":
      case "JOINT":
        bone.add(this.parseBone(_bones));
        break;
      case "End":
        this.currentLine++;
        this.currentLine++;
        bone.isEnd = true;
        bone.endOffsetX = this.lines[this.currentLine].offsetX;
        bone.endOffsetY = this.lines[this.currentLine].offsetY;
        bone.endOffsetZ = this.lines[this.currentLine].offsetZ;
        this.currentLine++;
        this.currentLine++;
        return bone;
      case "}":
        return bone;
      }
      this.currentLine++;
    }
    return bone;
  };	


  function Bvh(_str) {
    this.bones = [];
    this.isLoop = false;

    new BvhParser(this, _str);
  }

  Bvh.prototype.destroy = function() {
    this.bones = null;
    this.frames = null;
    this.rootBone = null;
  };

  function toRadian(theta) {
    return theta / 180 * Math.PI;
  }

  Bvh.prototype.gotoFrame = function(_frame) {
    if (!this.isLoop) {
      if (_frame >= this.numFrames) _frame = this.numFrames-1;
    } else {
      while (_frame >= this.numFrames) _frame -= this.numFrames;	
    }
    var frame = this.frames[_frame];
    var numFrame = frame.length;
    var count = 0;
    var i;
    var l;
    _.each(this.bones, function(_bone) {
      l = _bone.numChannels;
      for ( i=0; i<l; i++ ) {
        if ( count < numFrame ) {
          var c = _bone.channels[i],
              v = frame[count];
          switch (c) {
          case 'Xposition':
            _bone.position.x = v;
            break;
          case 'Yposition':
            _bone.position.y = v;
            break;
          case 'Zposition':
            _bone.position.z = v;
            break;
          case 'Xrotation':
            _bone.rotation.x = toRadian(v);
            break;
          case 'Yrotation':
            _bone.rotation.y = toRadian(v);
            break;
          case 'Zrotation':
            _bone.rotation.z = toRadian(v);
            break;
          default:
            throw new Error('unknown animation channel:' + c);
          }
          count++;
        }
      }
    });
  };

  function MotionMan(_path, after){
    this.load(_path, after);
  }

  exports.MotionMan = MotionMan;

  MotionMan.prototype.destroy = function() {
    if ( this.bvh ) this.bvh.destroy();
    this.bvh = null;
  };

  MotionMan.prototype.load = function(_path, _fn) {// load bvh and parse
    var that = this;
    $.get(_path, function(data) {
      that.bvh = new Bvh(String(data));
      that.bvh.isLoop = true;
      if (_fn) _fn();
    });
  };

  MotionMan.prototype.update = function(_time) {
    if ( !this.bvh ) return;
    //frame of BVH
    this.bvh.gotoFrame(Math.floor(_time/(this.bvh.frameTime)));
  };

  return exports;
})();
