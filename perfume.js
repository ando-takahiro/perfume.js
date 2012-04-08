var perfume = (function() {
  var exports = {};

class BvhLine{
	private var _lineType:String;
	private var _boneType:String;
	
	private var _boneName:String;
	private var _offsetX:Number;
	private var _offsetY:Number;
	private var _offsetZ:Number;
	private var _numChannels:uint;
	private var _channelsProps:Vector.<String>;
	private var _numFrames:uint;
	private var _frameTime:Number;
	private var _frames:Vector.<Number>;
	
	public function BvhLine(_str : String) {
		parse(_str);
	}
	
	private function parse(_str:String):void {
		var _lineStr:String = _str;
		_lineStr = trim(_lineStr);
		
		var words : Array = _lineStr.split(" ");
		if (String(words[0]).indexOf("Frames:") != -1) {
			words[0] = "Frames:";
			words.push( _lineStr.split(":")[1] );
		}
		if (words[0] == "Frame" && words.length == 2) {
			words[1] = "Time:";
			words[2] = _lineStr.split(":")[1];
		}
		if (!isNaN(Number(words[0]))){
			_lineType = "FRAME";
		} else {
			_lineType = words[0];
		}
		switch (_lineType){
			case "HIERARCHY":
				break;
			case "ROOT":
			case "JOINT":
				_boneType = (words[0] == "ROOT") ? "ROOT" : "JOINT";
				_boneName = words[1];
				break;
			case "OFFSET":
				_offsetX = Number(words[1]);
				_offsetY = Number(words[2]);
				_offsetZ = Number(words[3]);
				break;
			case "CHANNELS":
				_numChannels = Number(words[1]);
				_channelsProps = new Vector.<String>();
				for (var i:int = 0; i < _numChannels; i++) _channelsProps.push( words[i+2] );
				break;
			case "Frames:":
				_numFrames = Number(words[1]);
				break;
			case "Frame":
				_frameTime = Number(words[2]);
				break;
			case "End":
			case "{":
			case "}":
			case "MOTION":
				break;
			case "FRAME":
				_frames = new Vector.<Number>();
				for each (var word : String in words) _frames.push( Number(word) );
				break;
		}
	}		
	
    private function trim(str:String):String {
        var startIndex:int = 0;
        while (isWhitespace(str.charAt(startIndex)))
            ++startIndex;

        var endIndex:int = str.length - 1;
        while (isWhitespace(str.charAt(endIndex)))
            --endIndex;

        if (endIndex >= startIndex)
            return str.slice(startIndex, endIndex + 1);
        else
            return "";
    }

    private function isWhitespace(character:String):Boolean{
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
	
	public function get frames():Vector.<Number> { return _frames; }
	public function get frameTime():Number { return _frameTime; }
	public function get numFrames():uint { return _numFrames; }
	public function get channelsProps():Vector.<String> { return _channelsProps; }
	public function get numChannels():uint { return _numChannels; }
	public function get offsetZ():Number { return _offsetZ; }
	public function get offsetY():Number { return _offsetY; }
	public function get offsetX():Number { return _offsetX; }
	public function get boneName():String { return _boneName; }
	public function get boneType():String { return _boneType; }
	public function get lineType():String { return _lineType; }
}
	class BvhParser{
		private var _lines:Vector.<BvhLine>
		private var _currentLine:uint;
		private var _currentBone:BvhBone;
		
		public function BvhParser(_bvh:Bvh, _str:String) {
			var line_arr:Array = _str.split("\n");
			
			_lines = new Vector.<BvhLine>();		
			for each (var _line_str:String in line_arr) {
				_lines.push(new BvhLine(_line_str));
			}
	
			_currentLine = 1;
			_bvh.rootBone = parseBone(_bvh.bones);
			
			var currentLine:uint;
			for (currentLine = 0; currentLine < _lines.length; currentLine++) {
				if (_lines[currentLine].lineType == "MOTION") break;
			}
			
			currentLine++;
			var _numFrames:Number = _lines[currentLine].numFrames;
			_bvh.numFramesInternal = _numFrames;
			currentLine++;
			_bvh.frameTimeInternal = _lines[currentLine].frameTime;
			currentLine++;
			
			var _frames:Vector.<Vector.<Number>> = new Vector.<Vector.<Number>>();
			var i:int;
			var l:int = _lines.length;
			for (i = currentLine; i < l; i++) {
				_frames.push(_lines[i].frames);
			}
			_bvh.frames = _frames;
			
			_numFrames = _bvh.numFramesInternal = _frames.length;
		}
		
		private function parseBone(_bones:Vector.<BvhBone>):BvhBone {
			var bone:BvhBone = new BvhBone( _currentBone );
			
			_bones.push(bone);
			
			bone.name = _lines[_currentLine].boneName;
			
			_currentLine++;
			_currentLine++;
			bone.offsetX = _lines[_currentLine].offsetX;
			bone.offsetY = _lines[_currentLine].offsetY;
			bone.offsetZ = _lines[_currentLine].offsetZ;
				
			_currentLine++;
			bone.numChannels = _lines[_currentLine].numChannels;
			bone.channels = _lines[_currentLine].channelsProps;
				
			_currentLine++;
			
			while (_currentLine < _lines.length){
				switch (_lines[_currentLine].lineType){
					case "ROOT":
					case "JOINT":
						var child : BvhBone = parseBone(_bones);
						child.parent = bone;
						bone.children.push(child);
						break;
					case "End":
						_currentLine++;
						_currentLine++;
						bone.isEnd = true;
						bone.endOffsetX = _lines[_currentLine].offsetX;
						bone.endOffsetY = _lines[_currentLine].offsetY;
						bone.endOffsetZ = _lines[_currentLine].offsetZ;
						_currentLine++;
						_currentLine++;
						return bone;
						break;
					case "}":
						return bone;
						break;
				}
				_currentLine++;
			}
			return bone;
		}		
	}
	public class Bvh{
		public var isLoop:Boolean;
		
		private var _rootBone:BvhBone;
		prfmbvh function set rootBone(__bone:BvhBone):void{ _rootBone = __bone; }
		
		private var _frames:Vector.<Vector.<Number>>;
		prfmbvh function set frames(__frames:Vector.<Vector.<Number>>):void{ _frames = __frames; }
		
		private var _numFrames:uint;
		public function get numFrames():Number { return _numFrames; }
		prfmbvh function set numFramesInternal(_num:Number):void { _numFrames = _num; }
		
		private var _frameTime:Number;
		public function get frameTime():Number { return _frameTime; }
		prfmbvh function set frameTimeInternal(_num:Number):void { _frameTime = _num; }
		
		private var _bones:Vector.<BvhBone>;
		public function get bones():Vector.<BvhBone> { return _bones; }
		
		public function Bvh(_str:String) {
			_bones = new Vector.<BvhBone>();
			new BvhParser(this, _str);
		}
		
		public function destroy():void {
			_bones = null;
			_frames = null;
			_rootBone = null;
		}
		
		public function gotoFrame(_frame:uint):void {
			if (!isLoop) {
				if (_frame >= _numFrames) _frame = _numFrames-1;
			} else {
				while (_frame >= _numFrames) _frame -= _numFrames;	
			}
			var frame:Vector.<Number> = _frames[_frame];
			var numFrame:int = frame.length;
			var count:int = 0;
			var i:int;
			var l:int;
			for each (var _bone:BvhBone in _bones) {
				l = _bone.numChannels;
				for ( i=0; i<l; i++ ) {
					if ( count < numFrame ) {
						_bone[_bone.channels[i]] = frame[count];
						count++;
					}
				}
			}
		}
		
	}

	public class BvhBone{
		public var name:String;
		public var offsetX:Number = 0;
		public var offsetY:Number = 0;
		public var offsetZ:Number = 0;
		
		public var endOffsetX:Number = 0;
		public var endOffsetY:Number = 0;
		public var endOffsetZ:Number = 0;
		
		public var Xposition:Number = 0;
		public var Yposition:Number = 0;
		public var Zposition:Number = 0;
		public var Xrotation:Number = 0;
		public var Yrotation:Number = 0;
		public var Zrotation:Number = 0;
		
		public var numChannels:int;
		public var channels:Vector.<String>;
		
		public var parent:BvhBone;
		public var children:Vector.<BvhBone>;
		
		public var isEnd:Boolean = false;
		
		public function BvhBone(_parent:BvhBone = null) {
			parent = _parent;
			channels = new Vector.<String>();
			children = new Vector.<BvhBone>();
		}
		
		public function get isRoot():Boolean {
			return (parent == null);
		}
		
		public function destroy():void {
			parent = null;
			channels = null;
			children = null;
		}
	}

	public class MotionMan{
		private var bvh:Bvh;
		private var circles:Array;
		private var target:Sprite;
		public function MotionMan(_target:Sprite, _path:String){
			target = _target;
			load(_path);
		}
		
		public function destroy():void{
			if ( bvh ) bvh.destroy();
			bvh = null;
			for each ( var sp:Sprite in circles ) if ( sp.parent ) sp.parent.removeChild(sp);
			circles = null;
			target = null;
		}
		
		private function load(_path:String, _fn:Function = null):void{// load bvh and parse
			var ld:URLLoader = new URLLoader();
			ld.addEventListener(Event.COMPLETE, function(e:Event):void{
				ld.removeEventListener(Event.COMPLETE, arguments.callee);
				bvh = new Bvh(String(ld.data));
				bvh.isLoop = true;
				createCircles(bvh.bones.length + 5);
				if ( _fn != null ) _fn();
			});
			ld.load(new URLRequest(_path));
		}
		
		private function createCircles(_num:int):void{
			circles = [];
			var sp:Sprite;
			var col:uint = Math.random()*0xFFFFFF;
			for ( var i:int=0; i<_num; i++ ){
				sp = new Sprite();
				sp.graphics.beginFill(col,1);
				sp.graphics.drawCircle(0,0,4);
				target.addChild( sp );	
				circles.push( sp );
			}
		}
		
		private function calcBonePosition(bone:BvhBone, matrix:Matrix3D):void{
			// coordinate system in BVH is right-handed.
			while ( bone ) {
				matrix.appendRotation(bone.Zrotation, Vector3D.Z_AXIS);
				matrix.appendRotation(-bone.Xrotation, Vector3D.X_AXIS);
				matrix.appendRotation(-bone.Yrotation, Vector3D.Y_AXIS);
				matrix.appendTranslation(bone.Xposition+bone.offsetX, bone.Yposition+bone.offsetY, -(bone.Zposition+bone.offsetZ));
				bone = bone.parent;
			}
			// if BVH's coordinate system is left-handed then use below.
			/*
			while ( bone ) {
				matrix.appendRotation(bone.Yrotation, Vector3D.Y_AXIS);
				matrix.appendRotation(bone.Xrotation, Vector3D.X_AXIS);
				matrix.appendRotation(bone.Zrotation, Vector3D.Z_AXIS);
				matrix.appendTranslation(bone.Xposition+bone.offsetX, bone.Yposition+bone.offsetY, bone.Zposition+bone.offsetZ);
				bone = bone.parent;
			}
			*/
		}

		public function update(_time:Number):void{
			if ( !bvh ) return;
			//frame of BVH
			bvh.gotoFrame( _time/(bvh.frameTime*1000) );
			
			//calculate joint's position
			var a:Array = [];
			for each (var bone:BvhBone in bvh.bones) {
				var _p0:BvhBone = bone;
				var matrix:Matrix3D = new Matrix3D();
				calcBonePosition(bone, matrix);
				a.push(_p0, matrix.position.x, matrix.position.y - 70, -matrix.position.z);
				
				if ( _p0.isEnd ) {// endSite
					bone = _p0;
					matrix.identity();
					matrix.appendTranslation(bone.endOffsetX, bone.endOffsetY, -bone.endOffsetZ);
					calcBonePosition(bone, matrix);
					a.push(_p0, matrix.position.x, matrix.position.y - 70, -matrix.position.z);
				}
			}
			
			// re-position
			var i:int = 0;
			var l:int = a.length/4;
			var sp:Sprite;
			for ( i = 0; i<l; i++ ) {
				sp = circles[i];
				sp.x = a[i*4+1] * 2;
				sp.y = -a[i*4+2] * 2;
				sp.z = a[i*4+3] * 2 + 200;
			}
			drawLines(target, a);
		}
		
		private function drawLines(_target:Sprite, a:Array):void{
			var i:int = 0;
			var l:int = a.length;
			var sp:Sprite;
			var sp2:Sprite;
			var pt:Point;
			var pt2:Point;
			var _b:BvhBone;
			var _b2:BvhBone;
			var _index:int;
			const ZERO:Point = new Point();
			for ( i=0; i<l; i+=4 ){
				_b = a[i];
				sp = circles[i / 4];
				pt = sp.localToGlobal(ZERO);
				if ( _b.children.length > 0 ){
					for each ( _b2 in _b.children ) {
						_index = a.indexOf(_b2);
						sp2 = circles[_index / 4];
						pt2 = sp2.localToGlobal(ZERO);
						_target.graphics.lineStyle(1, 0x777777);
						_target.graphics.moveTo(pt.x - _target.x, pt.y - _target.y);
						_target.graphics.lineTo(pt2.x - _target.x, pt2.y - _target.y);
					}
				} else if ( _b.isEnd ) {
					_b2 = a[i+4];
					if ( _b == _b2 ) {
						_index = i+4;
						sp2 = circles[_index / 4];
						pt2 = sp2.localToGlobal(ZERO);
						_target.graphics.lineStyle(1, 0x00AAFF);
						_target.graphics.moveTo(pt.x - _target.x, pt.y - _target.y);
						_target.graphics.lineTo(pt2.x - _target.x, pt2.y - _target.y);
					}
				}
			}
		}
	}
  return exports;
})();
