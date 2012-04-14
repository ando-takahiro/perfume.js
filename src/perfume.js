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
    _bvh.numFramesInternal = _numFrames;
    currentLine++;
    _bvh.frameTimeInternal = this.lines[currentLine].frameTime;
    currentLine++;

    var _frames = [];
    var i;
    var l = this.lines.length;
    for (i = currentLine; i < l; i++) {
      _frames.push(this.lines[i].frames);
    }
    _bvh.frames = _frames;

    _numFrames = _bvh.numFramesInternal = _frames.length;
  }

  BvhParser.prototype.parseBone = function(_bones) {
		var materials = [];
		for ( var i = 0; i < 6; i ++ ) {
			materials.push( new THREE.MeshBasicMaterial( { color: Math.random() * 0xffffff } ) );
		}

    var bone = new THREE.Mesh(
      new THREE.CubeGeometry(2, 2, 2, 1, 1, 1, materials), new THREE.MeshFaceMaterial()
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
          _bone[_bone.channels[i]] = frame[count];
          count++;
        }
      }
    });
  };

  function generateSprite() {
    var canvas = document.createElement( 'canvas' );
    canvas.width = 16;
    canvas.height = 16;

    var context = canvas.getContext( '2d' );
    var gradient = context.createRadialGradient( canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2 );
    gradient.addColorStop( 0, 'rgba(255,255,255,1)' );
    gradient.addColorStop( 0.2, 'rgba(0,255,255,1)' );
    gradient.addColorStop( 0.4, 'rgba(0,0,64,1)' );
    gradient.addColorStop( 1, 'rgba(0,0,0,1)' );

    context.fillStyle = gradient;
    context.fillRect( 0, 0, canvas.width, canvas.height );

    return canvas;
  }

  function makeMaterial() {
    return new THREE.ParticleBasicMaterial({
      //map: new THREE.Texture(generateSprite()),
      color: 0xFF2222FF,
      size: 10,
      blending: THREE.AdditiveBlending
    });
  }

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
    this.bvh.gotoFrame( _time/(this.bvh.frameTime*1000) );

    //calculate joint's position
    //var a:Array = [];
    //for each (var bone:BvhBone in this.bvh.bones) {
    //  var _p0:BvhBone = bone;
    //  var matrix:Matrix3D = new Matrix3D();
    //  calcBonePosition(bone, matrix);
    //  a.push(_p0, matrix.position.x, matrix.position.y - 70, -matrix.position.z);

    //  if ( _p0.isEnd ) {// endSite
    //    bone = _p0;
    //    matrix.identity();
    //    matrix.appendTranslation(bone.endOffsetX, bone.endOffsetY, -bone.endOffsetZ);
    //    calcBonePosition(bone, matrix);
    //    a.push(_p0, matrix.position.x, matrix.position.y - 70, -matrix.position.z);
    //  }
    //}

    //// re-position
    //var i:int = 0;
    //var l:int = a.length/4;
    //var sp:Sprite;
    //for ( i = 0; i<l; i++ ) {
    //  sp = this.circles[i];
    //  sp.x = a[i*4+1] * 2;
    //  sp.y = -a[i*4+2] * 2;
    //  sp.z = a[i*4+3] * 2 + 200;
    //}
    //drawLines(this.target, a);
  };

  //private function drawLines(_target:Sprite, a:Array):void{
  //  var i:int = 0;
  //  var l:int = a.length;
  //  var sp:Sprite;
  //  var sp2:Sprite;
  //  var pt:Point;
  //  var pt2:Point;
  //  var _b:BvhBone;
  //  var _b2:BvhBone;
  //  var _index:int;
  //  const ZERO:Point = new Point();
  //  for ( i=0; i<l; i+=4 ){
  //    _b = a[i];
  //    sp = this.circles[i / 4];
  //    pt = sp.localToGlobal(ZERO);
  //    if ( _b.children.length > 0 ){
  //      for each ( _b2 in _b.children ) {
  //        _index = a.indexOf(_b2);
  //        sp2 = this.circles[_index / 4];
  //        pt2 = sp2.localToGlobal(ZERO);
  //        _target.graphics.lineStyle(1, 0x777777);
  //        _target.graphics.moveTo(pt.x - _target.x, pt.y - _target.y);
  //        _target.graphics.lineTo(pt2.x - _target.x, pt2.y - _target.y);
  //      }
  //    } else if ( _b.isEnd ) {
  //      _b2 = a[i+4];
  //      if ( _b == _b2 ) {
  //        _index = i+4;
  //        sp2 = this.circles[_index / 4];
  //        pt2 = sp2.localToGlobal(ZERO);
  //        _target.graphics.lineStyle(1, 0x00AAFF);
  //        _target.graphics.moveTo(pt.x - _target.x, pt.y - _target.y);
  //        _target.graphics.lineTo(pt2.x - _target.x, pt2.y - _target.y);
  //      }
  //    }
  //  }
  //}
  return exports;
})();
