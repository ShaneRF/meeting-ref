from django.shortcuts import render
from django.http import HttpResponse,JsonResponse
# from django.db import connection
from datetime import datetime
from django.core.exceptions import ObjectDoesNotExist, MultipleObjectsReturned
from django.shortcuts import redirect
from google.cloud import speech_v1p1beta1 as speech
import io
from channels.layers import get_channel_layer #0814 2232新增
from asgiref.sync import async_to_sync #0814 2232新增
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from google.cloud import speech
import os
import logging
from datetime import datetime
from django.conf import settings  #驗證有無產生錄音檔是：結果是正常
# from django.http import JsonResponse

# 設置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create your views here.


def list(requests):
    PKind = "list"
    return render(requests, "pages/meeting/list.html", locals())


def add(requests):
    return render(requests, "pages/meeting/edit.html")


def edit(requests, id):
    try:
        # employee = Employee.objects.get(MMid=id)
        return redirect('/')
    except ObjectDoesNotExist:
        return redirect('/')
    except MultipleObjectsReturned:
        return redirect('/')
    return render(requests, "pages/meeting/edit.html")


def senddata(requests):
    try:
        # employee = Employee.objects.get(MMid=id)
        return redirect('/')
    except ObjectDoesNotExist:
        return redirect('/')
    except MultipleObjectsReturned:
        return redirect('/')
    return render(requests, "pages/meeting/edit.html")


#def chatroom(requests):
#    return render(requests, "pages/meeting/chatroom.html")

def chatroom(requests, meeting_id=None):
    # 如果沒有提供 meeting_id，可以使用一個默認值或者重定向到列表頁面
    if meeting_id is None:
        # 可以選擇重定向到會議列表頁面
        # return redirect('meeting_list')
        # 或者使用一個默認的會議 ID
        meeting_id = 1  # 或者其他適當的默認值
    
    # 這裡可以添加獲取會議詳情的邏輯
    # meeting = get_meeting_details(meeting_id)
    
    context = {
        'meeting_id': meeting_id,
        # 'meeting': meeting,  # 如果有獲取會議詳情的邏輯
        # 其他需要傳遞給模板的數據
    }
    return render(requests, "pages/meeting/chatroom.html", context)
    #return render(requests, "pages/meeting/chatroom.html", {'meeting_id': meeting_id})
    
@csrf_exempt
def process_audio(request):
    if request.method == 'POST':
        audio_file = request.FILES['audio']
        
        # 生成唯一的文件名
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"audio_{timestamp}.webm"
        transcript_filename = f"transcript_{timestamp}.txt"
        
        # 保存音頻文件
        file_path = os.path.join(settings.MEDIA_ROOT, filename)
        with open(file_path, 'wb+') as destination:
            for chunk in audio_file.chunks():
                destination.write(chunk)
        
        logger.info(f"音頻文件已保存: {file_path}")

        # 使用保存的文件進行轉錄
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = r"D:\BackupData\shane\Desktop\meeting\django-server-30-429202-4d4ce05e3a9b.json"
        client = speech.SpeechClient()

        with open(file_path, "rb") as audio_file:
            content = audio_file.read()

        audio = speech.RecognitionAudio(content=content)
        config = speech.RecognitionConfig(
            encoding=speech.RecognitionConfig.AudioEncoding.WEBM_OPUS,
            sample_rate_hertz=48000,
            language_code="zh-TW",
            audio_channel_count=1,
        )

        logger.info("正在使用 Google Speech-to-Text API 進行轉換...")
        try:
            response = client.recognize(config=config, audio=audio)
            logger.info(f"收到 {len(response.results)} 個結果")
            transcript = ""
            for result in response.results:
                transcript += result.alternatives[0].transcript + " "
            logger.info(f"转录结果：{transcript}")
            
            # 保存转录文本，包括时间戳
            transcript_file_path = os.path.join(settings.MEDIA_ROOT, transcript_filename)
            formatted_timestamp = datetime.now().strftime("%Y/%m/%d %H:%M:%S")
            with open(transcript_file_path, 'w', encoding='utf-8') as f:
                f.write(f"[{formatted_timestamp}] {transcript}\n")
            
            return JsonResponse({
                'success': True, 
                'transcript': transcript, 
                'audio_file': filename,
                'transcript_file': transcript_filename,
                'timestamp': timestamp
            })
        except Exception as e:
            logger.error(f"转录过程中出错: {str(e)}")
            return JsonResponse({
                'success': False, 
                'error': str(e), 
                'audio_file': filename
            })
    
    return JsonResponse({'error': '无效的请求方法'}, status=400)


#@csrf_exempt
#def transcribe_audio(request):
#    if request.method == 'POST':
#        data = json.loads(request.body)
#        audio_content = base64.b64decode(data['audio'])
#
#        client = speech.SpeechClient()
#        audio = speech.RecognitionAudio(content=audio_content)
#        config = speech.RecognitionConfig(
#            encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
#            sample_rate_hertz=48000,
#            language_code="zh-TW",
#        )
#
#        response = client.recognize(config=config, audio=audio)
#
#        transcript = ""
#        for result in response.results:
#            transcript += result.alternatives[0].transcript
#
#        return JsonResponse({'transcript': transcript})
#
#    return JsonResponse({'error': 'Invalid request method'}, status=400)