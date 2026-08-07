import boto3
import os
import urllib.parse
from PIL import Image
import io

s3_client = boto3.client('s3')

def lambda_handler(event, context):
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = urllib.parse.unquote_plus(record['s3']['object']['key'])
        
        # Only process files in attachments/ prefix
        if not key.startswith('attachments/') or '-thumb' in key:
            continue
            
        print(f"Generating thumbnail for {key} in {bucket}")
        
        try:
            # Get the original image
            response = s3_client.get_object(Bucket=bucket, Key=key)
            image_content = response['Body'].read()
            
            # Check if it's an image before trying to resize
            content_type = response.get('ContentType', '')
            if not content_type.startswith('image/'):
                print(f"Skipping non-image file: {key}")
                continue
                
            # Resize image
            with Image.open(io.BytesIO(image_content)) as img:
                img.thumbnail((200, 200))
                thumb_buffer = io.BytesIO()
                # Save as same format
                img.save(thumb_buffer, format=img.format)
                thumb_buffer.seek(0)
                
            # Create thumbnail key
            parts = key.rsplit('.', 1)
            if len(parts) == 2:
                thumb_key = f"{parts[0]}-thumb.{parts[1]}"
            else:
                thumb_key = f"{key}-thumb"
                
            # Upload thumbnail
            s3_client.put_object(
                Bucket=bucket,
                Key=thumb_key,
                Body=thumb_buffer,
                ContentType=content_type
            )
            print(f"Successfully generated thumbnail: {thumb_key}")
            
        except Exception as e:
            print(f"Error processing object {key} from bucket {bucket}. Event: {event}")
            print(e)
            raise e
