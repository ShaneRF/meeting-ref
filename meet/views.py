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
import glob
import whisper 

# from django.http import JsonResponse

# 設置日誌
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# 加载 Whisper 模型（可以选择不同大小的模型，如 'tiny', 'base', 'small', 'medium', 'large'）
#model = whisper.load_model("medium", download_root=r"D:\BackupData\shane\Desktop\GitHub sample\Whisper\ggml-medium.bin")
model = whisper.load_model("medium", download_root=r"D:\BackupData\shane\Desktop\GitHub sample\Whisper")
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
        
        # 保存音频文件
        file_path = os.path.join(settings.MEDIA_ROOT, filename)
        with open(file_path, 'wb+') as destination:
            for chunk in audio_file.chunks():
                destination.write(chunk)
        
        logger.info(f"音频文件已保存: {file_path}")

        try:
            # 使用 Whisper 进行转录
            result = model.transcribe(file_path)
            transcript = result["text"]
            
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


@csrf_exempt
def end_meeting(request):
    if request.method == 'POST':
        try:
            # 步骤1: 整合所有的转录文本
            transcript_files = glob.glob(os.path.join(settings.MEDIA_ROOT, "transcript_*.txt"))
            combined_transcript = ""
            for file in sorted(transcript_files):
                with open(file, 'r', encoding='utf-8') as f:
                    combined_transcript += f.read() + "\n"

            # 生成合并后的文件名
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            combined_filename = f"combo_{timestamp}.txt"
            combined_file_path = os.path.join(settings.MEDIA_ROOT, combined_filename)

            # 保存合并后的文本
            with open(combined_file_path, 'w', encoding='utf-8') as f:
                f.write(combined_transcript)

            # 步骤2: 翻译合并后的文本
            translator = whisper()
            translation = translator.translate(combined_transcript, src='zh-tw', dest='en')

            # 保存翻译后的文本
            translated_filename = f"EN_combo_{timestamp}.txt"
            translated_file_path = os.path.join(settings.MEDIA_ROOT, translated_filename)
            with open(translated_file_path, 'w', encoding='utf-8') as f:
                f.write(translation.text)

            return JsonResponse({
                'success': True,
                'combined_file': combined_filename,
                'translated_file': translated_filename
            })
        except Exception as e:
            logger.error(f"结束会议时出错: {str(e)}")
            return JsonResponse({
                'success': False,
                'error': str(e)
            })

    return JsonResponse({'error': '无效的请求方法'}, status=400)   

     
    