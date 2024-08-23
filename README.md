所需的依賴模組
pip install channels
pip install channels-redis 
pip install google-cloud-speech

★解壓縮static至根目錄，因我無法上傳整個static資料夾上github。

這個整合版本保留了原有的聊天室布局和成員列表，同時添加了新的語音轉文字功能。主要變更包括：

添加了錄音按鈕和停止錄音按鈕。
添加了音頻可視化效果。
添加了一個新的區域來顯示轉錄的文字。
整合了錄音、發送音頻到服務器和接收轉錄文字的 JavaScript 代碼。

為了實現描述的功能，還需要確保以下幾點：

在 Django 視圖中處理音頻文件和調用 Google Speech-to-Text API。
設置適當的 URL 路由來處理音頻處理請求。
確保已安裝必要的依賴（如 google-cloud-speech）。
在 Django 設置中配置 Google Cloud 認證。

關於選擇 Google Speech-to-Text 還是 OpenAI 的功能，建議使用 Google Speech-to-Text，原因如下：

實時性：Google Speech-to-Text 提供了良好的實時轉錄支持。
多語言支持：支持多種語言和方言，包括中文。
準確性：在處理背景噪音和多人對話方面表現良好。
集成簡單：與 Django 應用程序的集成相對直接。

以下為修改時動到的原檔：
1.首先，在 meet/views.py 中添加新的視圖函數：
2.在 meeting/urls.py 中添加新的 URL 路徑：
3.更新 templates/pages/meeting/chatroom.html：
4.在 meeting/settings.py 中添加 Google Cloud 認證設置：
5.更新 meeting/routing.py
6.更新 meeting/asgi.py
7.在 meeting/settings.py 中添加 Channels 配置:

08/18 將即時語音傳輸的方案調整方向 「先錄製語音檔」→傳送「翻文字」→持續「錄音」→傳送
傳送語音檔的方式傳給google轉文字後，再print出來在聊天室中，以下說明步驟。
先實現可以錄十秒的暫存音訊檔，傳送給GOOGLE再接收回傳的文字，實現以下方向： 
步驟 1 .將每次錄製音訊10秒傳送給google，轉成文字，回傳回來。 
步驟 2 .接收google回傳的結果，在終端機打印出來 參考以下確實可以在筆電上可以執行傳送錄音檔給google轉文字的程式碼： 
步驟3.等上述完成後，再調整聊天室(chatroom.html)將回傳的文字呈現在聊天室對話框裡，
步驟4.再將文字做翻譯，中文翻譯為英文。

08/19 完成上述方向
1.將每次錄製10秒的方案，調整為20秒錄製語音檔傳送，
2.新增監測語音，如無語音則停止錄製語音，
3.如超過20秒則系統，先傳送20秒音檔給GOOGLE，同時持續啟動錄製新語音檔。
4.監測環境如無音訊超過1秒，則停止錄音，持續監測到聲音→啟動錄音。
5.最後語音如未滿20秒則結束錄音，傳送給GOOGLE轉文字。
6.生成語音檔及中文文字檔存於MEDIA資料夾裡。

08/20 完成中文錄音檔合併→翻譯為英文。

08/21 使用舊env。
      顯示以下訊息：
      Python\Python312\Lib\site-packages\torch\__init__.py", line 148, in <module>
      Python\Python312\Lib\site-packages\torch\lib\fbgemm.dll" or one of its dependencies.

    如執行時出現錯誤 OSError: [WinError 126] 找不到指定的模組。 Error loading ****略**fbgemm.dll" or one of its dependencies.，可以下載並安装最新的 Visual C++ Redistributable
    https://aka.ms/vs/17/release/vc_redist.x64.exe

    改善問題：捨棄舊版env。  
    ★改用conda create虛擬環境，如果採用GPU運算，需確認CUDA版本，我的是12.5，採用11.8兼容。
    conda create -n whisper_env python=3.9
    conda activate whisper_env
    conda install pytorch torchvision torchaudio pytorch-cuda=11.8 -c pytorch -c nvidia
    pip install openai-whisper django

    1.採用普通版本的whisper 模型。約1.5G。
    放置的路徑：model = whisper.load_model("medium", download_root=r"放的資料夾路徑\Whisper")
    2.PyTorch版本相依：
    
    如果使用CPU進行語音辨視，請執行以下語法。
    pip install torch==1.10.0+cpu torchvision==0.11.0+cpu torchaudio==0.10.0+cpu -f https://download.pytorch.org/whl/torch_stable.html
    
    CUDA相容版次對應：
    https://download.pytorch.org/whl
    例如：檢視顯卡屬性可以查看到 NVDIA CUDA XX.X.XXX
    https://www.nvidia.com/zh-tw/geforce/drivers/
    https://docs.nvidia.com/cuda/cuda-toolkit-release-notes/index.html

    如果使用GPU，驗證CUDA版本：
    python -c "import torch; print(torch.__version__); print(torch.cuda.is_available())"
    應該要出現以下：
    2.4.0
    True

    3.環境變數，確認一下：
    C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.5\bin
    C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v12.5\libnvvp

    4.完成後，基本上whisper的辨視率與速度，是比google的STT和googletrans的Translator，快與準。
08/22
    1.whisper 搭配deep_translator翻英文和日文及簡體中文
      deep-translator==1.11.4
      （原始合併-   combo_
      （簡體合併-CN_combo_
      （英文合併-EN_combo_
      （日文合併-JP_combo_
    儲存在media資料夾裡。

    