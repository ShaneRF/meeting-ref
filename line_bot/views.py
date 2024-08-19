from django.shortcuts import render
from django.http import HttpResponse, HttpResponseBadRequest, HttpResponseForbidden, JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings

# 引入 linebot SDK
from linebot import LineBotApi, WebhookParser
from linebot.exceptions import InvalidSignatureError, LineBotApiError
from linebot.models import MessageEvent, TextSendMessage, TextMessage,StickerMessage,ImageMessage


# 建立 linebot classs 進行連線
line_bot_api = LineBotApi(settings.LINE_CHANNEL_ACCESS_TOKEN)
parser = WebhookParser(settings.LINE_CHANNEL_SECRET)


@csrf_exempt
def callback(request):
    if (request.method == "POST"):
        signature = request.META['HTTP_X_LINE_SIGNATURE']
        body = request.body.decode('utf-8')

        # 嘗試解密event
        try:
            events = parser.parse(body, signature)
        except InvalidSignatureError:
            return HttpResponseForbidden()
        except LineBotApiError:
            return HttpResponseBadRequest()

        for event in events:
            print(event)
            if isinstance(event, MessageEvent):
                if isinstance(event.message, TextMessage):
                    res_text = event.message.text
                    # uid = event.message.text
                    if res_text == '@我要報到':
                        line_bot_api.reply_message(event.reply_token, StickerMessage(package_id=446, sticker_id=1988))
                    elif res_text == '@我的名牌':
                        line_bot_api.reply_message(event.reply_token, TextSendMessage(text="456"))
                    elif res_text == '@車號登入':
                        line_bot_api.reply_message(event.reply_token, TextSendMessage(text="456"))
                    else:
                        line_bot_api.reply_message(event.reply_token, TextSendMessage(text=res_text))

        return HttpResponse()
    else:
        return HttpResponseBadRequest()


def sendMsg(requests, uid, msg):
    # push_message 因為會有收費問題，所以可以建議改用 reply_message
    line_bot_api.push_message(uid, TextSendMessage(text=msg))
    return HttpResponse()
