using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Web;
using System.Web.Http;
using FundEntities;
using Microsoft.Win32;
using Microsoft.WindowsAzure.ServiceRuntime;
using Microsoft.WindowsAzure.Storage;
using Microsoft.WindowsAzure.Storage.Blob;

namespace MvcWebRole.Controllers
{
    public class FileUploadController : ApiController
    {
        static readonly string hostContainer = "fileuploads";
        static CloudBlobContainer blobContainer;

        public FileUploadController()
            : base()
        {
            var storageAccount = CloudStorageAccount.Parse(
                RoleEnvironment.GetConfigurationSettingValue("StorageConnectionString"));

            // Create the blob client.
            CloudBlobClient blobClient = storageAccount.CreateCloudBlobClient();

            // Retrieve a reference to a previously created container.
            blobContainer = blobClient.GetContainerReference(hostContainer);
        }

        // GET api/fileupload
        public HttpResponseMessage Get(string id)
        {
            var blockBlob = blobContainer.GetBlockBlobReference(id);

            var response = new HttpResponseMessage(HttpStatusCode.OK);
            var blobStream = blockBlob.OpenRead();

            response.Content = new StreamContent(blobStream);
            response.Content.Headers.ContentLength = blockBlob.Properties.Length;
            response.Content.Headers.ContentType = new MediaTypeHeaderValue(blockBlob.Properties.ContentType);
            response.Content.Headers.ContentDisposition = new ContentDispositionHeaderValue("attachment")
            {
                FileName = blockBlob.Name,
                Size = blockBlob.Properties.Length,
            };

            return response;
        }

        // POST api/fileupload
        public HttpResponseMessage Post()
        {
            var newFile = new FileUpload();

            string fileKey = HttpContext.Current.Request.Files.Keys[0];

            HttpPostedFile file = HttpContext.Current.Request.Files[fileKey];
            
            // Skip unused file control.
            if (file.ContentLength <= 0)
            {
                return Request.CreateErrorResponse(HttpStatusCode.BadRequest,
                    "Error: No file found.");
            }

            string contentType = file.ContentType;
            string fileExtension = GetDefaultExtension(contentType);

            // Check for unsupported file types.
            if (fileExtension == null)
            {
                return Request.CreateErrorResponse(HttpStatusCode.UnsupportedMediaType,
                    "Error: File type not supported.");
            }

            string guid = Guid.NewGuid().ToString();
            string fileName = guid + fileExtension;
            string src = "/api/fileupload/get?id=" + fileName;

            // Add filename to srcList
            newFile = new FileUpload
            {
                Id = fileName,
                DateTimeCreated = new DateTimeOffset(DateTime.UtcNow),
                Source = src,
                ContentType = file.ContentType,
                OriginalFileName = file.FileName
            };

            // Retrieve reference to the blob we want to create            
            CloudBlockBlob blockBlob = blobContainer.GetBlockBlobReference(fileName);
            blockBlob.Properties.ContentType = file.ContentType;
            blockBlob.UploadFromStream(file.InputStream);

            return Request.CreateResponse(HttpStatusCode.Created, newFile);
        }

        // DELETE api/fileupload
        public HttpResponseMessage Delete(string id)
        {
            CloudBlockBlob blockBlob;

            try
            {
                // Retrieve reference to a blob named "myblob.txt".
                blockBlob = blobContainer.GetBlockBlobReference(id);
            }
            catch (Exception e)
            {
                return Request.CreateErrorResponse(HttpStatusCode.NotFound, e.Message);
            }

            try
            {
                // Delete the blob.
                blockBlob.Delete();
                return Request.CreateResponse(HttpStatusCode.NoContent, "application/json");
            }
            catch (Exception e)
            {
                return Request.CreateErrorResponse(HttpStatusCode.InternalServerError, e);
            }
        }

        #region Private helper methods
        public static string GetDefaultExtension(string mimeType)
        {
            if (mimeType == null)
            {
                throw new ArgumentException("mimeType");
            }
            string extension;
            return contentTypeMappings.TryGetValue(mimeType, out extension) ? extension : null;
        }

        private static IDictionary<string, string> contentTypeMappings =
            new Dictionary<string, string>(StringComparer.InvariantCultureIgnoreCase)
            {
                {"application/msword", ".doc"},
                {"application/vnd.openxmlformats-officedocument.wordprocessingml.document", ".docx"},
                {"application/vnd.ms-word.document.macroEnabled.12", ".docm"},
                {"application/vnd.ms-excel", ".xls"},
                {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ".xlsx"},
                {"application/vnd.ms-excel.sheet.macroEnabled.12", ".xlsm"},
                {"application/vnd.ms-powerpoint", ".ppt"},
                {"application/vnd.openxmlformats-officedocument.presentationml.presentation", ".pptx"},
                {"application/pdf", ".pdf"}
            };
        #endregion
    }
}
