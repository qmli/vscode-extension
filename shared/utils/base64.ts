/**
 * Base64 编码解码类
 */
class Base64 {
  // 私有属性：Base64 字符表
  private readonly _keyStr: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

  /**
   * 编码字符串为 Base64
   * @param input 原始数据
   * @returns Base64 编码后的字符串
   */
  encode(input: string): string {
    let output = '';
    let chr1: number;
    let chr2: number;
    let chr3: number;
    let enc1: number;
    let enc2: number;
    let enc3: number;
    let enc4: number;
    let i = 0;
    input = this.utf8Encode(input);
    while (i < input.length) {
      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);
      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;
      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }
      output =
        output +
        this._keyStr.charAt(enc1) +
        this._keyStr.charAt(enc2) +
        this._keyStr.charAt(enc3) +
        this._keyStr.charAt(enc4);
    }
    return output;
  }

  /**
   * 解码 Base64 字符串
   * @param input Base64 编码的字符串
   * @returns 解码后的原始字符串
   */
  decode(input: string): string {
    let output = '';
    let chr1: number;
    let chr2: number;
    let chr3: number;
    let enc1: number;
    let enc2: number;
    let enc3: number;
    let enc4: number;
    let i = 0;
    input = input.replace(/[^A-Za-z0-9+/=]/g, '');
    while (i < input.length) {
      enc1 = this._keyStr.indexOf(input.charAt(i++));
      enc2 = this._keyStr.indexOf(input.charAt(i++));
      enc3 = this._keyStr.indexOf(input.charAt(i++));
      enc4 = this._keyStr.indexOf(input.charAt(i++));
      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;
      output = output + String.fromCharCode(chr1);
      if (enc3 !== 64) {
        output = output + String.fromCharCode(chr2);
      }
      if (enc4 !== 64) {
        output = output + String.fromCharCode(chr3);
      }
    }
    output = this.utf8Decode(output);
    return output;
  }

  /**
   * UTF-8 编码
   * @param string 原始字符串
   * @returns UTF-8 编码后的字符串
   */
  private utf8Encode(string: string): string {
    string = string.replace(/\r\n/g, '\n');
    let utfText = '';
    for (let n = 0; n < string.length; n++) {
      const c = string.charCodeAt(n);
      if (c < 128) {
        utfText += String.fromCharCode(c);
      } else if (c > 127 && c < 2048) {
        utfText += String.fromCharCode((c >> 6) | 192);
        utfText += String.fromCharCode((c & 63) | 128);
      } else {
        utfText += String.fromCharCode((c >> 12) | 224);
        utfText += String.fromCharCode(((c >> 6) & 63) | 128);
        utfText += String.fromCharCode((c & 63) | 128);
      }
    }
    return utfText;
  }

  /**
   * UTF-8 解码
   * @param utfText UTF-8 编码的字符串
   * @returns 解码后的原始字符串
   */
  private utf8Decode(utfText: string): string {
    let string = '';
    let i = 0;
    let c2: number;
    let c3: number;
    let c = (c2 = 0);
    while (i < utfText.length) {
      c = utfText.charCodeAt(i);
      if (c < 128) {
        string += String.fromCharCode(c);
        i++;
      } else if (c > 191 && c < 224) {
        c2 = utfText.charCodeAt(i + 1);
        string += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
        i += 2;
      } else {
        c2 = utfText.charCodeAt(i + 1);
        c3 = utfText.charCodeAt(i + 2);
        string += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
        i += 3;
      }
    }
    return string;
  }
}

// 导出已实例化的 base64 对象
const base64 = new Base64();
export { base64 };
// 导出已实例化的 base64 对象
